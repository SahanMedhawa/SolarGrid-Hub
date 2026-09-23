param(
    [int]$Port = 5500
)

Set-Location $PSScriptRoot
node .\serve.js $Port