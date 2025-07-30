# Script para migrar NotificationService a UnifiedNotificationService

$files = @(
    "src\app\core\interceptors\app-error.interceptor.ts",
    "src\app\features\chat\store\chat.effects.ts",
    "src\app\features\favorites\favorites.ts",
    "src\app\features\parking-detail\components\parking-booking\parking-booking.ts",
    "src\app\features\plaza\components\notify-plaza-button\notify-plaza-button.component.ts",
    "src\app\features\plaza\components\notify-plaza-modal\notify-plaza-modal.component.ts",
    "src\app\shared\components\notification-container\notification-container.component.ts",
    "src\app\store\auth\auth.effects.ts"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "Updating $file"
        (Get-Content $file) -replace "NotificationService", "UnifiedNotificationService" -replace "@core/services/notification.service", "@core/services/unified-notification.service" | Set-Content $file
    }
}

Write-Host "Migration completed!"
