#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:5000}"

echo "Running domain-routing smoke checks against: ${BASE_URL}"

apply_root_html="$(curl -fsS -H 'Host: apply.wfconnect.org' "${BASE_URL}/")"
if [[ "${apply_root_html}" != *"Application Received!"* ]]; then
  echo "FAIL: apply root did not serve apply-form.html marker"
  exit 1
fi

guide_root_headers="$(curl -fsSI -H 'Host: guide.wfconnect.org' "${BASE_URL}/")"
if [[ "${guide_root_headers}" != *"Location: /guide"* ]]; then
  echo "FAIL: guide root did not redirect to /guide"
  exit 1
fi

apply_apply_html="$(curl -fsS -H 'Host: apply.wfconnect.org' "${BASE_URL}/apply")"
if [[ "${apply_apply_html}" != *"Upload Documents"* ]]; then
  echo "FAIL: apply /apply did not serve apply-form content"
  exit 1
fi
if [[ "${apply_apply_html}" == *"Continue to Agreement Terms"* ]]; then
  echo "FAIL: apply /apply leaked guide onboarding content"
  exit 1
fi

guide_apply_html="$(curl -fsS -H 'Host: guide.wfconnect.org' "${BASE_URL}/apply")"
if [[ "${guide_apply_html}" != *"Continue to Agreement Terms"* ]]; then
  echo "FAIL: guide /apply did not serve full onboarding content"
  exit 1
fi

echo "PASS: domain-routing smoke checks completed"
