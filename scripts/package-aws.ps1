$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$archivePath = Join-Path $root 'finsense-aws.zip'

Push-Location -LiteralPath $root
try {
    # Include repository source and local edits, while filtering out unrelated files.
    $paths = git -c core.quotepath=false ls-files --cached --others --exclude-standard
    if ($LASTEXITCODE -ne 0) { throw 'Unable to list the project source files.' }

    $paths = $paths | Sort-Object -Unique | Where-Object {
        $_ -match '^(Dockerfile|\.dockerignore|package\.json|scripts/build-aws\.mjs|client/\.env\.aws)$' -or
        $_ -match '^client/(src/|public/|index\.html$|package(-lock)?\.json$|.*config\.(json|ts|js)$|tsconfig\..*\.json$)' -or
        $_ -match '^server/(app/|lib/|prisma/(schema\.prisma|seed\.ts|ensure-admin\.ts)$|public/|schemas/|proxy\.ts$|package(-lock)?\.json$|.*config\.(json|ts|mjs)$)'
    } | Where-Object {
        $_ -notmatch '(^|/)(\.env(?!\.aws$)(\.|$)|cookies\.txt$)' -and
        (Test-Path -LiteralPath $_ -PathType Leaf)
    }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $archive = [IO.Compression.ZipFile]::Open($archivePath, 'Update')
    try {
        foreach ($entry in @($archive.Entries)) { $entry.Delete() }
        foreach ($relativePath in $paths) {
            [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $archive, (Join-Path $root $relativePath), $relativePath
            )
        }
    } finally {
        $archive.Dispose()
    }
    Write-Output $archivePath
} finally {
    Pop-Location
}
