Param (
    [string]$printerName,
    [string]$content
)

# Asegúrate de que el contenido se envíe como texto sin problemas.
$content | Out-Printer -Name $printerName -ErrorAction Stop

if ($?) {
    Write-Host "Impresión enviada correctamente a la impresora: $printerName"
} else {
    Write-Error "Error al enviar a la impresora: $printerName"
}
