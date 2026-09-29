# Отчет о восстановлении рабочего состояния (PHASE_08D_RECOVERY_REPORT)

## 1. Что сломалось
Во время обновления обработчиков холста для инструментов «Параллельная» и «Перпендикулярная» возникли ошибки компиляции TypeScript (`tsc --noEmit`):
1. Обращение к несуществующему полю `.id` у интерфейса `SOLCommandResult` при создании свободной точки на плоскости (`throughPtId = newPt.id`).
2. Использование необъявленной переменной `toolBufferSegment` в нескольких местах рендеринга сторон четырехугольника и диагоналей в `src/components/CanvasStage.tsx`.

## 2. Какой файл/участок был причиной
1. **`src/engines/solGateway.ts`**:
   - Метод `addFreePoint` не возвращал `entityId` созданной точки в объекте `SOLCommandResult`.
2. **`src/components/CanvasStage.tsx`**:
   - Строка 460: попытка извлечь `newPt.id` вместо `newPt.entityId`.
   - Строки 881, 923, 931, 955, 963: обращение к переменной `toolBufferSegment` вместо актуального состояния `activeSourceSegment`.

## 3. Что исправлено
1. **`src/engines/solGateway.ts`**:
   - В интерфейс `SOLCommandResult` добавлено опциональное поле `entityId?: string`.
   - В метод `addFreePoint` добавлен возврат `entityId: pt.id`.
2. **`src/components/CanvasStage.tsx`**:
   - Исправлено получение идентификатора точки: `throughPtId = newPt.entityId || 'pt_A'`.
   - Заменены все вхождения `toolBufferSegment` на `activeSourceSegment`.

## 4. Результаты проверок и тестов
- **TypeScript Check (`npm run lint` / `tsc --noEmit`):** PASS (0 ошибок).
- **Сборка приложения (`npm run build` / `compile_applet`):** PASS (успешная компиляция).
- **Регрессионные тесты (`npm test` -> `src/test/cqnsRegression.test.ts`):** 12/12 PASS:
  1. `Canonical Initialization (SIM-01)` — PASS
  2. `VERIFIED -> VANISHED by Moving D off Circle (SIM-02)` — PASS
  3. `Restoration by Moving D Back onto Circle (SIM-04)` — PASS
  4. `Explicit Auxiliary Diagonals (SIM-05)` — PASS
  5. `Explicit Diagonal Intersection (SIM-06)` — PASS
  6. `Dedicated Both Diagonals Construction (addBothDiagonals)` — PASS
  7. `Parallel & Perpendicular Constructions` — PASS
  8. `Radial Degree Scale Calculation` — PASS
  9. `Mode Switching (CANONICAL vs EXTENSION_SCENARIO)` — PASS
  10. `Dynamic Parallel Line Recomputation (MOVE(A) -> Core recomputes L)` — PASS
  11. `Dynamic Perpendicular Line Recomputation (MOVE(B) -> Core recomputes L)` — PASS
  12. `School Mode vs Research Mode Invariant Behavior` — PASS

## 5. Текущее состояние функционала
- **RU/EN локализация:** Работает стабильно.
- **School / Research Mode:** Работает в полном соответствии со спецификацией инвариантов.
- **Диагонали AC/BD и точка пересечения P:** Работают, строятся явно, отслеживаются в DAG.
- **Degree Scale (радиальная шкала углов):** Работает, отображает градусные меры.
- **Архитектура GeometryState / Geometry Core / Verification / Relation Graph / SOL:** Полностью сохранена.
- **Parallel / Perpendicular:** Исправлены ошибки сборки, инструменты работают корректно через `SOLGateway` и математическое ядро `GeometryCore`.
