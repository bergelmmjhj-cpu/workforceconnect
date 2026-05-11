(function initWorkforceAddressAutocomplete(global) {
  const namespace = "[PLACES_CLIENT]";
  const manualFallbackMessage =
    "Address suggestions are currently unavailable. Please continue by typing your full address manually, including city, province, and postal code.";
  const defaultPlaceFields = [
    "address_components",
    "formatted_address",
    "geometry",
    "place_id",
    "types",
  ];

  function log(level, event, detail, diagnosticsEnabled) {
    const payload = {
      timestamp: new Date().toISOString(),
      event: event,
      detail: detail || null,
    };
    if (level === "debug" && !diagnosticsEnabled) {
      return;
    }
    const logger = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
    logger(namespace, payload);
  }

  function getAddressComponent(place, type, field) {
    const components = Array.isArray(place && place.address_components) ? place.address_components : [];
    for (let index = 0; index < components.length; index += 1) {
      const component = components[index];
      const componentTypes = Array.isArray(component.types) ? component.types : [];
      if (componentTypes.indexOf(type) !== -1) {
        return component[field || "long_name"] || "";
      }
    }
    return "";
  }

  function extractPlaceData(place) {
    const streetNumber = getAddressComponent(place, "street_number", "long_name");
    const route = getAddressComponent(place, "route", "long_name");
    const city =
      getAddressComponent(place, "locality", "long_name") ||
      getAddressComponent(place, "postal_town", "long_name") ||
      getAddressComponent(place, "administrative_area_level_3", "long_name") ||
      getAddressComponent(place, "sublocality_level_1", "long_name");
    const province = getAddressComponent(place, "administrative_area_level_1", "short_name");
    const postalCode = getAddressComponent(place, "postal_code", "long_name");
    const country = getAddressComponent(place, "country", "long_name") || "Canada";
    const geometry = place && place.geometry ? place.geometry : null;
    const location = geometry && geometry.location ? geometry.location : null;
    const latitude = location && typeof location.lat === "function" ? location.lat() : null;
    const longitude = location && typeof location.lng === "function" ? location.lng() : null;

    return {
      formattedAddress: place && place.formatted_address ? place.formatted_address : "",
      streetNumber: streetNumber,
      route: route,
      addressLine1: [streetNumber, route].filter(Boolean).join(" ").trim(),
      city: city,
      province: province,
      postalCode: postalCode,
      country: country,
      latitude: latitude,
      longitude: longitude,
      placeId: place && place.place_id ? place.place_id : "",
      types: Array.isArray(place && place.types) ? place.types : [],
    };
  }

  function createAddressAutocomplete(props) {
    const options = props || {};
    const input = options.input || null;
    const warningElement = options.warningElement || null;
    const retryButton = options.retryButton || null;
    const suggestionsContainer = options.suggestionsContainer || null;
    const diagnosticsEnabled = !!options.diagnosticsEnabled;
    const onChange = typeof options.onChange === "function" ? options.onChange : function noop() {};
    const onPlaceSelected =
      typeof options.onPlaceSelected === "function" ? options.onPlaceSelected : function noop() {};
    const onValidationChange =
      typeof options.onValidationChange === "function" ? options.onValidationChange : function noop() {};
    const onFallbackStateChange =
      typeof options.onFallbackStateChange === "function"
        ? options.onFallbackStateChange
        : function noop() {};
    const clearResolvedFields =
      typeof options.clearResolvedFields === "function" ? options.clearResolvedFields : function noop() {};
    const showError = typeof options.showError === "function" ? options.showError : function noop() {};
    const clearError = typeof options.clearError === "function" ? options.clearError : function noop() {};
    const componentPlaceholder = options.placeholder || "123 Main St, Toronto, ON";
    const countryRestriction = String(options.countryRestriction || "ca").toLowerCase();
    const required = !!options.required;

    let autocomplete = null;
    let autocompleteListener = null;
    let fallbackMode = null;
    let fallbackReason = null;
    let addressValidated = false;

    function setAddressValidated(nextValue) {
      addressValidated = !!nextValue;
      onValidationChange(addressValidated);
    }

    function syncFallbackUi() {
      if (warningElement) {
        if (fallbackMode) {
          warningElement.textContent = manualFallbackMessage;
          warningElement.classList.add("show");
        } else {
          warningElement.textContent = "";
          warningElement.classList.remove("show");
        }
      }
      if (retryButton) {
        retryButton.classList.toggle("show", fallbackMode === "transient");
      }
    }

    function activateFallback(mode, reason, detail) {
      fallbackMode = mode;
      fallbackReason = reason;
      syncFallbackUi();
      clearError();
      onFallbackStateChange({
        active: true,
        mode: mode,
        reason: reason,
        detail: detail || null,
      });
      log("warn", "fallback_mode_triggered", {
        mode: mode,
        reason: reason,
        detail: detail || null,
      }, diagnosticsEnabled);
    }

    function clearFallback(reason) {
      fallbackMode = null;
      fallbackReason = null;
      syncFallbackUi();
      onFallbackStateChange({
        active: false,
        mode: null,
        reason: reason || null,
      });
      log("info", "fallback_mode_cleared", {
        reason: reason || null,
      }, diagnosticsEnabled);
    }

    function clearAutocompleteSuggestions() {
      if (!suggestionsContainer) {
        return;
      }
      suggestionsContainer.innerHTML = "";
      suggestionsContainer.classList.remove("open");
    }

    function handleLoaderFailure(result) {
      const retryable = !!(result && result.detail && result.detail.retryable);
      const reason = result && result.reason ? result.reason : "google_script_failed_to_load";
      const failureMode = retryable ? "transient" : "permanent";
      activateFallback(failureMode, reason, result && result.detail ? result.detail : null);
    }

    function initializeAutocomplete(loadOptions) {
      if (!input) {
        handleLoaderFailure({
          reason: "input_ref_missing",
          detail: {
            retryable: false,
            message: "AddressAutocomplete was initialized before the input ref existed.",
          },
        });
        return Promise.resolve(null);
      }

      if (input.placeholder !== componentPlaceholder) {
        input.placeholder = componentPlaceholder;
      }
      if (required) {
        input.setAttribute("aria-required", "true");
      }

      return global.WorkforceGooglePlacesLoader.loadGooglePlaces(loadOptions || {}).then(function onLoaderResult(result) {
        if (!result || !result.ok) {
          handleLoaderFailure(result || null);
          return null;
        }

        if (!global.google || !global.google.maps || !global.google.maps.places) {
          handleLoaderFailure({
            reason: "places_library_missing",
            detail: {
              retryable: false,
              message: "window.google.maps.places was unavailable after Google Maps script load.",
            },
          });
          return null;
        }

        try {
          autocomplete = new global.google.maps.places.Autocomplete(input, {
            componentRestrictions: { country: countryRestriction },
            fields: defaultPlaceFields,
            types: ["address"],
          });
        } catch (error) {
          handleLoaderFailure({
            reason: "autocomplete_constructor_failed",
            detail: {
              retryable: false,
              message: error instanceof Error ? error.message : String(error),
            },
          });
          return null;
        }

        if (autocompleteListener && typeof autocompleteListener.remove === "function") {
          autocompleteListener.remove();
        }

        autocompleteListener = autocomplete.addListener("place_changed", function onPlaceChanged() {
          const place = autocomplete.getPlace ? autocomplete.getPlace() : null;
          const placeData = extractPlaceData(place || {});

          if (!placeData.country || String(placeData.country).toLowerCase() !== "canada") {
            setAddressValidated(false);
            clearResolvedFields();
            showError("Only Canadian addresses are accepted");
            log("warn", "place_rejected_non_canadian", placeData, diagnosticsEnabled);
            return;
          }

          if (
            !placeData.formattedAddress ||
            !placeData.placeId ||
            !placeData.addressLine1 ||
            !placeData.city ||
            !placeData.province ||
            placeData.latitude === null ||
            placeData.longitude === null
          ) {
            setAddressValidated(false);
            clearResolvedFields();
            showError("Please choose a complete Canadian address suggestion.");
            log("warn", "place_rejected_incomplete", placeData, diagnosticsEnabled);
            return;
          }

          clearError();
          clearFallback("google_place_selected");
          setAddressValidated(true);
          onPlaceSelected(placeData);
          log("info", "place_selected", {
            placeId: placeData.placeId,
            city: placeData.city,
            province: placeData.province,
          }, diagnosticsEnabled);
        });

        clearFallback("google_places_ready");
        clearAutocompleteSuggestions();
        return autocomplete;
      }).catch(function onLoaderException(error) {
        handleLoaderFailure({
          reason: "google_script_failed_to_load",
          detail: {
            retryable: true,
            message: error instanceof Error ? error.message : String(error),
          },
        });
        return null;
      });
    }

    if (input) {
      input.value = options.value || input.value || "";
      input.addEventListener("input", function onAddressInput(event) {
        clearAutocompleteSuggestions();
        setAddressValidated(false);
        clearResolvedFields();
        clearError();
        onChange(event && event.target ? event.target.value : input.value);
      });
    }

    if (retryButton) {
      retryButton.addEventListener("click", function onRetryClick() {
        log("info", "fallback_retry_requested", {
          previousReason: fallbackReason,
        }, diagnosticsEnabled);
        initializeAutocomplete({ forceReload: true });
      });
    }

    initializeAutocomplete();

    return {
      isFallbackActive: function isFallbackActive() {
        return fallbackMode !== null;
      },
      isAddressValidated: function isAddressValidated() {
        return addressValidated;
      },
      getFallbackReason: function getFallbackReason() {
        return fallbackReason;
      },
      reinitialize: function reinitialize(loadOptions) {
        return initializeAutocomplete(loadOptions || { forceReload: true });
      },
      destroy: function destroyAutocomplete() {
        clearAutocompleteSuggestions();
        if (autocompleteListener && typeof autocompleteListener.remove === "function") {
          autocompleteListener.remove();
        }
      },
    };
  }

  global.WorkforceAddressAutocomplete = {
    createAddressAutocomplete: createAddressAutocomplete,
    MANUAL_FALLBACK_MESSAGE: manualFallbackMessage,
  };
})(window);
