(function initWorkforceGooglePlacesLoader(global) {
  const namespace = "[GOOGLE_PLACES_LOADER]";
  const config = global.__WORKFORCE_GOOGLE_PLACES_CONFIG__ || {};
  const scriptId = "workforce-google-places-api";
  const callbackName = "__workforceGooglePlacesInit";
  const timeoutMs = Number(config.scriptLoadTimeoutMs) || 15000;
  const diagnosticsEnabled = !!config.diagnosticsEnabled;
  const googleMapsScriptHost = "maps.googleapis.com";

  let loadPromise = null;
  let loaderState = {
    status: "idle",
    reason: null,
    detail: null,
  };
  let lastCspViolation = null;
  let capturedGoogleMapsMessages = [];
  let restoreConsole = null;

  function log(level, event, detail) {
    if (level === "debug" && !diagnosticsEnabled) {
      return;
    }
    const payload = {
      timestamp: new Date().toISOString(),
      event: event,
      detail: detail || null,
    };
    const logger = level === "error" ? console.error : level === "warn" ? console.warn : console.info;
    logger(namespace, payload);
  }

  function setLoaderState(status, reason, detail) {
    loaderState = {
      status: status,
      reason: reason || null,
      detail: detail || null,
    };
    return Object.assign({ ok: status === "loaded" }, loaderState);
  }

  function resetLoaderState() {
    const existingScript = document.getElementById(scriptId);
    if (existingScript && existingScript.parentNode) {
      existingScript.parentNode.removeChild(existingScript);
    }
    loadPromise = null;
    loaderState = {
      status: "idle",
      reason: null,
      detail: null,
    };
    lastCspViolation = null;
    capturedGoogleMapsMessages = [];
    if (restoreConsole) {
      restoreConsole();
      restoreConsole = null;
    }
    delete global[callbackName];
  }

  function createFailure(reason, detail) {
    const result = setLoaderState("failed", reason, detail);
    log("error", "load_failed", {
      reason: reason,
      detail: detail || null,
    });
    return result;
  }

  function createSuccess(detail) {
    const result = setLoaderState("loaded", null, detail || null);
    log("info", "load_succeeded", {
      envVar: config.envVar || "none",
    });
    return result;
  }

  function captureConsoleMessages() {
    const originalError = console.error.bind(console);
    const originalWarn = console.warn.bind(console);
    const matcher = /google maps javascript api error/i;

    console.error = function patchedConsoleError() {
      const message = Array.prototype.join.call(arguments, " ");
      if (matcher.test(message)) {
        capturedGoogleMapsMessages.push(message);
      }
      return originalError.apply(console, arguments);
    };

    console.warn = function patchedConsoleWarn() {
      const message = Array.prototype.join.call(arguments, " ");
      if (matcher.test(message)) {
        capturedGoogleMapsMessages.push(message);
      }
      return originalWarn.apply(console, arguments);
    };

    restoreConsole = function restoreGoogleMapsConsoleCapture() {
      console.error = originalError;
      console.warn = originalWarn;
    };
  }

  function extractGoogleMapsErrorReason() {
    const combinedMessages = capturedGoogleMapsMessages.join(" | ");

    if (/RefererNotAllowedMapError/i.test(combinedMessages)) {
      return {
        reason: "referrer_or_domain_restriction_issue",
        retryable: false,
        diagnosticMessage: combinedMessages,
      };
    }
    if (/InvalidKeyMapError|ApiKeyNotFoundMapError|ExpiredKeyMapError/i.test(combinedMessages)) {
      return {
        reason: "api_key_rejected",
        retryable: false,
        diagnosticMessage: combinedMessages,
      };
    }
    if (/BillingNotEnabledMapError/i.test(combinedMessages)) {
      return {
        reason: "api_key_rejected",
        retryable: false,
        diagnosticMessage: combinedMessages,
        billingIssue: true,
      };
    }
    if (/ApiNotActivatedMapError/i.test(combinedMessages)) {
      return {
        reason: "places_library_missing",
        retryable: false,
        diagnosticMessage: combinedMessages,
        apiNotActivated: true,
      };
    }

    return null;
  }

  function removeCspListener(listener) {
    if (listener) {
      document.removeEventListener("securitypolicyviolation", listener);
    }
  }

  function loadGooglePlaces(options) {
    const loadOptions = options || {};

    if (global.google && global.google.maps && global.google.maps.places) {
      return Promise.resolve(createSuccess({ source: "already_available" }));
    }

    if (loadOptions.forceReload) {
      resetLoaderState();
    } else if (loadPromise) {
      return loadPromise;
    }

    const apiKey = String(loadOptions.apiKey || config.apiKey || "").trim();
    if (!apiKey) {
      return Promise.resolve(
        createFailure("missing_api_key", {
          retryable: false,
          envVar: config.envVar || "none",
          message:
            "Missing VITE_GOOGLE_MAPS_API_KEY for frontend Google Places autocomplete. " +
            "Legacy GOOGLE_MAPS_API_KEY and GOOGLE_PLACES_API_KEY fallbacks are also supported.",
        }),
      );
    }

    loaderState = {
      status: "loading",
      reason: null,
      detail: {
        envVar: config.envVar || "none",
      },
    };
    capturedGoogleMapsMessages = [];
    captureConsoleMessages();

    loadPromise = new Promise(function resolveGooglePlacesLoad(resolve) {
      let settled = false;
      let timeoutId = null;
      let script = document.getElementById(scriptId);

      function settle(result) {
        if (settled) {
          return;
        }
        settled = true;
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        removeCspListener(handleCspViolation);
        if (restoreConsole) {
          restoreConsole();
          restoreConsole = null;
        }
        delete global[callbackName];
        resolve(result);
      }

      function handleCspViolation(event) {
        const blockedUri = String(event.blockedURI || "");
        if (blockedUri.indexOf(googleMapsScriptHost) === -1) {
          return;
        }
        lastCspViolation = {
          blockedURI: blockedUri,
          effectiveDirective: event.effectiveDirective || "",
          violatedDirective: event.violatedDirective || "",
        };
        log("error", "csp_blocked_script", lastCspViolation);
      }

      document.addEventListener("securitypolicyviolation", handleCspViolation);

      global[callbackName] = function onGooglePlacesLoaded() {
        const detectedError = extractGoogleMapsErrorReason();
        if (detectedError) {
          settle(createFailure(detectedError.reason, detectedError));
          return;
        }
        if (!global.google) {
          settle(createFailure("google_namespace_missing", { retryable: false }));
          return;
        }
        if (!global.google.maps) {
          settle(createFailure("maps_namespace_missing", { retryable: false }));
          return;
        }
        if (!global.google.maps.places) {
          settle(
            createFailure("places_library_missing", {
              retryable: false,
              message: "Google Maps script loaded, but google.maps.places is unavailable.",
            }),
          );
          return;
        }
        settle(createSuccess({ source: "script_callback" }));
      };

      global.gm_authFailure = function onGoogleMapsAuthFailure() {
        const detectedError = extractGoogleMapsErrorReason() || {
          reason: "api_key_rejected",
          retryable: false,
          diagnosticMessage:
            "Google Maps JavaScript API authentication failed. This can be caused by an invalid API key, billing issues, or referrer/domain restrictions.",
        };
        log("error", detectedError.reason, {
          hostname: global.location ? global.location.hostname : "",
          envVar: config.envVar || "none",
          diagnosticMessage: detectedError.diagnosticMessage || null,
        });
        settle(
          createFailure(detectedError.reason, Object.assign({}, detectedError, {
            hostname: global.location ? global.location.hostname : "",
            envVar: config.envVar || "none",
          })),
        );
      };

      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.async = true;
        script.defer = true;
        script.src =
          "https://maps.googleapis.com/maps/api/js?key=" +
          encodeURIComponent(apiKey) +
          "&libraries=places&callback=" +
          encodeURIComponent(callbackName) +
          "&loading=async&v=weekly";
        document.head.appendChild(script);
      }

      script.onerror = function onGooglePlacesScriptError() {
        const detectedError = extractGoogleMapsErrorReason();
        if (detectedError) {
          settle(createFailure(detectedError.reason, detectedError));
          return;
        }
        if (lastCspViolation) {
          settle(
            createFailure("csp_blocked_script", {
              retryable: false,
              violation: lastCspViolation,
            }),
          );
          return;
        }
        settle(
          createFailure("google_script_failed_to_load", {
            retryable: true,
            message:
              "Google Maps JavaScript API script failed to load. " +
              "Possible causes include network errors, CSP, or browser/script blocking.",
          }),
        );
      };

      timeoutId = setTimeout(function onGooglePlacesScriptTimeout() {
        const detectedError = extractGoogleMapsErrorReason();
        if (detectedError) {
          settle(createFailure(detectedError.reason, detectedError));
          return;
        }
        if (lastCspViolation) {
          settle(
            createFailure("csp_blocked_script", {
              retryable: false,
              violation: lastCspViolation,
            }),
          );
          return;
        }
        settle(
          createFailure("google_script_failed_to_load", {
            retryable: true,
            timeoutMs: timeoutMs,
            message: "Timed out waiting for Google Maps JavaScript API to load.",
          }),
        );
      }, timeoutMs);
    });

    return loadPromise;
  }

  global.WorkforceGooglePlacesLoader = {
    loadGooglePlaces: loadGooglePlaces,
    getState: function getState() {
      return Object.assign({}, loaderState);
    },
    reset: resetLoaderState,
  };
})(window);
