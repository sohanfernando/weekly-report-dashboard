<#
    Smoke test for the authentication and access-control rules.

    Exercises the whole cookie session lifecycle against a running backend and
    prints a pass/fail line per rule. Intended for manual checks during
    development; the authoritative checks live in the integration tests.

    Usage:
        .\scripts\smoke-auth.ps1
        .\scripts\smoke-auth.ps1 -BaseUrl http://localhost:8080
#>
param(
    [string]$BaseUrl = "http://localhost:8080",
    [string]$Email   = "smoke.user@example.com",
    [string]$Password = "password123"
)

$ErrorActionPreference = "Stop"
$pass = 0
$fail = 0

function Check {
    param([string]$Name, [int]$Expected, [scriptblock]$Call)
    try {
        $result = & $Call
        $status = 200
        if ($result -is [Microsoft.PowerShell.Commands.WebResponseObject]) { $status = $result.StatusCode }
    } catch {
        $status = $_.Exception.Response.StatusCode.value__
    }
    if ($status -eq $Expected) {
        Write-Host ("  PASS  {0,-45} {1}" -f $Name, $status) -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host ("  FAIL  {0,-45} got {1}, expected {2}" -f $Name, $status, $Expected) -ForegroundColor Red
        $script:fail++
    }
}

function Body($hash) { $hash | ConvertTo-Json -Compress }

Write-Host "`nAuth smoke test against $BaseUrl" -ForegroundColor Cyan

# The account may already exist from a previous run; both outcomes are fine.
try {
    Invoke-WebRequest "$BaseUrl/api/auth/register" -Method Post -ContentType "application/json" `
        -Body (Body @{ name = "Smoke User"; email = $Email; password = $Password; jobTitle = "QA" }) | Out-Null
    Write-Host "  seeded account $Email" -ForegroundColor DarkGray
} catch {
    Write-Host "  account $Email already present" -ForegroundColor DarkGray
}

Write-Host "`nRejections" -ForegroundColor Cyan
Check "unauthenticated /me is refused" 401 {
    Invoke-WebRequest "$BaseUrl/api/auth/me" -Method Get
}
Check "duplicate email is a conflict" 409 {
    Invoke-WebRequest "$BaseUrl/api/auth/register" -Method Post -ContentType "application/json" `
        -Body (Body @{ name = "Smoke User"; email = $Email; password = $Password })
}
Check "malformed payload is rejected" 400 {
    Invoke-WebRequest "$BaseUrl/api/auth/register" -Method Post -ContentType "application/json" `
        -Body (Body @{ name = ""; email = "not-an-email"; password = "short" })
}
Check "wrong password is refused" 401 {
    Invoke-WebRequest "$BaseUrl/api/auth/login" -Method Post -ContentType "application/json" `
        -Body (Body @{ email = $Email; password = "definitely-wrong" })
}
Check "unknown account is refused" 401 {
    Invoke-WebRequest "$BaseUrl/api/auth/login" -Method Post -ContentType "application/json" `
        -Body (Body @{ email = "nobody@example.com"; password = $Password })
}

Write-Host "`nSession lifecycle" -ForegroundColor Cyan
$login = Invoke-WebRequest "$BaseUrl/api/auth/login" -Method Post -ContentType "application/json" `
    -Body (Body @{ email = $Email; password = $Password }) -SessionVariable session

Check "login succeeds" 200 { $login }

$setCookie = $login.Headers['Set-Cookie']
foreach ($flag in @('HttpOnly', 'SameSite', 'Path=/')) {
    if ($setCookie -match $flag) {
        Write-Host ("  PASS  cookie carries {0,-33} yes" -f $flag) -ForegroundColor Green
        $pass++
    } else {
        Write-Host ("  FAIL  cookie carries {0,-33} MISSING" -f $flag) -ForegroundColor Red
        $fail++
    }
}

Check "authenticated /me succeeds" 200 {
    Invoke-WebRequest "$BaseUrl/api/auth/me" -Method Get -WebSession $session
}
Check "logout succeeds" 204 {
    Invoke-WebRequest "$BaseUrl/api/auth/logout" -Method Post -WebSession $session
}
Check "session is dead after logout" 401 {
    Invoke-WebRequest "$BaseUrl/api/auth/me" -Method Get -WebSession $session
}

Write-Host "`n$pass passed, $fail failed`n" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
if ($fail -gt 0) { exit 1 }
