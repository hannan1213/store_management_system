# Convenience script: create a virtual environment, install dependencies and start the app.
$ErrorActionPreference = "Stop"

$python = Join-Path $env:LOCALAPPDATA "Programs\Python\Python313\python.exe"
if (-not (Test-Path $python)) {
    $python = (Get-Command python -ErrorAction SilentlyContinue).Source
}
if (-not $python) {
    throw "Python was not found. Install it from https://www.python.org/downloads/"
}

if (-not (Test-Path ".venv")) {
    Write-Host "Creating virtual environment..."
    & $python -m venv .venv
    & ".\.venv\Scripts\python.exe" -m pip install --quiet --upgrade pip
    & ".\.venv\Scripts\python.exe" -m pip install --quiet -r requirements.txt
}

Write-Host "Starting Store Manager on http://127.0.0.1:5000"
& ".\.venv\Scripts\python.exe" run.py
