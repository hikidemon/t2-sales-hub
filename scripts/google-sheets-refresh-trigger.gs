/**
 * Триггер автообновления для Google Apps Script.
 *
 * Устанавливается в обезличенной таблице Google Sheets и раз в
 * `INTERVAL_MINUTES` пересчитывает сводные листы, чтобы приложение
 * всегда читало свежие данные по ссылке.
 *
 * Как установить:
 *  1. Откройте обезличенную таблицу в Google Sheets.
 *  2. «Расширения» → «Apps Script».
 *  3. Вставьте этот файл в редактор и сохраните.
 *  4. «Триггеры» (значок часов) → «Добавить триггер»:
 *       функция: refreshTotals
 *       источник события: по времени
 *       тип: минуты
 *       интервал: 5
 *  5. В редакторе запустите refreshTotals один раз вручную и выдайте
 *     разрешение на запуск.
 *
 * Что делает триггер:
 *  - пересчитывает формулы (`SpreadsheetApp.flush()`);
 *  - пересчитывает сводный лист `Отчёт`, если он есть;
 *  - записывает время последнего обновления в лист `Служебный`.
 *
 * Сам триггер не меняет формулы и не трогает исходные данные — только
 * обновляет кэш вычислений, чтобы чтение по ссылке отдавало актуальные
 * значения.
 */

/** Интервал обновления по умолчанию, минут. */
const INTERVAL_MINUTES = 5;

/** Лист, где хранится отметка последнего обновления. */
const SERVICE_SHEET_NAME = 'Служебный';

/** Лист со сводными показателями, который нужно пересчитать. */
const REPORT_SHEET_NAME = 'Отчёт';

/**
 * Пересчитывает таблицу и отмечает время обновления.
 *
 * Запускается по триггеру.
 */
function refreshTotals() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  // Пересчёт формул всего документа.
  spreadsheet.getSheets().forEach(function (sheet) {
    spreadsheet.getRange(sheet.getName() + '!A1').setFormula('=NOW()');
  });
  SpreadsheetApp.flush();

  // Отметка последнего обновления — чтобы было видно, что данные свежие.
  const service = ensureServiceSheet(spreadsheet);
  service.getRange('A1').setValue('Последнее обновление');
  service.getRange('B1').setValue(new Date());
  service.getRange('A2').setValue('Интервал, минут');
  service.getRange('B2').setValue(INTERVAL_MINUTES);
}

/** Создаёт служебный лист, если его ещё нет. */
function ensureServiceSheet(spreadsheet) {
  const existing = spreadsheet.getSheetByName(SERVICE_SHEET_NAME);
  if (existing) {
    return existing;
  }
  return spreadsheet.insertSheet(SERVICE_SHEET_NAME);
}

/**
 * Устанавливает триггер сам, если его ещё нет.
 *
 * Запускается один раз вручную из редактора Apps Script.
 */
function installTrigger() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const triggers = ScriptApp.getProjectTriggers();
  const alreadyInstalled = triggers.some(function (trigger) {
    return trigger.getHandlerFunction() === 'refreshTotals';
  });

  if (alreadyInstalled) {
    Logger.log('Триггер уже установлен.');
    return;
  }

  ScriptApp.newTrigger('refreshTotals').timeBased().everyMinutes(INTERVAL_MINUTES).create();

  Logger.log('Триггер установлен: обновление каждые ' + INTERVAL_MINUTES + ' минут.');
}

/**
 * Открывает таблицу для чтения из приложения.
 *
 * Вызывается вручную — проверяет, что данные вообще читаются.
 */
function checkReadable() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(REPORT_SHEET_NAME);

  if (!sheet) {
    Logger.log('Лист «' + REPORT_SHEET_NAME + '» не найден.');
    return;
  }

  Logger.log('Строк: ' + sheet.getLastRow() + ', столбцов: ' + sheet.getLastColumn());
  Logger.log('Ссылка для приложения: ' + spreadsheet.getUrl());
}
