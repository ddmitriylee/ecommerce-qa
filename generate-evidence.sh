#!/bin/bash
# Скрипт для генерации скриншотов для Assignment 2

echo "🚀 Начинаю генерацию скриншотов..."

# 1. Очистка старых данных
rm -rf assignment-evidence
mkdir -p assignment-evidence

# 2. Запуск Playwright тестов (клиент должен быть запущен или playwright сам запустит dev server)
# Мы используем cd чтобы гарантировать запуск из правильной папки
cd apps/client
npx playwright test --workers=1

# 3. Возвращаемся в корень и собираем скриншоты в одну папку
cd ../..
find apps/client/playwright-report/screenshots -name "*.png" -exec cp {} assignment-evidence/ \; 2>/dev/null
find apps/client/test-results -name "*.png" -exec cp {} assignment-evidence/ \; 2>/dev/null

echo "📊 Генерирую финальные таблицы метрик..."
node scripts/generate-assignment-report.js

echo "✅ Готово!"
echo "📍 Скриншоты здесь: assignment-evidence/"
echo "📍 Таблицы для отчета здесь: ASSIGNMENT_SUBMISSION.md"
ls -lh assignment-evidence
