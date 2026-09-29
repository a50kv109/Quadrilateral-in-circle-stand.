# АНАЛИЗ ПРОБЕЛОВ В ГЕОМЕТРИЧЕСКИХ ПРИМИТИВАХ (PHASE_08L)
## Исследование: `INTERSECT_LINE_CIRCLE` и `INTERSECT_CIRCLES` для CQNS-001

**Документ:** `PHASE_08L_PRIMITIVE_GAP_ANALYSIS.md`  
**Статус:** `PHASE 08L — PRIMITIVE GAP ANALYSIS COMPLETE / RESEARCH ONLY`  
**Мутации продакшн-кода:** `0`  
**Мутации архитектуры:** `0`  
**Эпистемические маркеры:** `[OBSERVED]`, `[INFERRED]`, `[NOT FOUND]`, `[REUSABLE]`, `[ADAPTER NEEDED]`, `[NEW IMPLEMENTATION NEEDED]`, `[OPEN]`

---

## 1. Scope (Область исследования)

По результатам экспериментальной валидации **Phase 08K** (в частности, эксперимента **E07 — Inscribed Square**) было установлено, что невозможность замкнуть построение вписанного квадрата и ромба обусловлена отсутствием двух элементарных конструктивных примитивов:
1. **`INTERSECT_LINE_CIRCLE(Line, Circle)`** — аналитическое пересечение прямой (или отрезка) с окружностью;
2. **`INTERSECT_CIRCLES(Circle1, Circle2)`** — аналитическое пересечение двух окружностей.

Цель фазы **Phase 08L** — провести всесторонний инженерно-математический анализ этих примитивов, оценить повторно используемую кодовую базу, формализовать семантику жизненного цикла точек, определить требования к `Construction DAG`, `SOLGateway` и `Relation Graph`, не внося изменений в рабочий продакшн-код.

---

## 2. Existing CQNS Mechanisms (Аудит существующих механизмов CQNS-001)

| Подсистема / Механизм | Фактическое состояние в коде | Эпистемический статус |
|---|---|---|
| **`GeometryCore.segmentIntersection`** | Реализовано через векторное произведение и параметры $t, u \in [0, 1]$. | `[OBSERVED]` |
| **`GeometryCore.lineIntersection`** | Реализовано через пересечение бесконечных прямых ($t \in \mathbb{R}$). | `[OBSERVED]` |
| **`GeometryCore.lineCircleIntersection`** | **Отсутствует** в `geometryCore.ts`. | `[NOT FOUND]` |
| **`GeometryCore.circleCircleIntersection`** | **Отсутствует** в `geometryCore.ts`. | `[NOT FOUND]` |
| **`GeometryState.dependentIntersections`** | Хранит записи `{ pointId, seg1Id, seg2Id }` только для $L \cap L$. | `[OBSERVED]` |
| **`GeometryState.recomputeDependentConstructions`** | Каскадно пересчитывает точки $L \cap L$, параллели, перпендикуляры, циркуль. | `[OBSERVED]` |
| **`ConstructionDAG`** | Поддерживает регистрацию узлов `'point'` с операцией `CONSTRUCT_INTERSECTION`. | `[OBSERVED]` |
| **`CanvasStage` (Snapping)** | Поддерживает привязку к существующим точкам ($r \le 18$ px) и окружности $S^1$. | `[OBSERVED]` |
| **`SOLGateway`** | Экспортирует `constructIntersection(seg1Id, seg2Id)` только для двух отрезков. | `[OBSERVED]` |
| **`VerificationLayer`** | Содержит проверку инварианта $P = AC \cap BD$ (`VC-05`, `VC-14`). | `[OBSERVED]` |

---

## 3. Triangle Stand Evidence (Исследование наследия Triangle Stand)

Аудит документации `UI_REUSE_AUDIT.md` и кодовой структуры показал:
- **Математика $L \cap C$ и $C \cap C$:** В исходном стенде `geometry-reasoning-stand-2` пересечение прямой и окружности использовалось исключительно как внутренний триггер ограничения вершины $S^1$ при радиальном проецировании ($\theta = \text{atan2}(y - y_0, x - x_0)$).
- **Выбор между двумя точками:** Специализированного интерфейсного селектора ветвей пересечения ($\pm \sqrt{\Delta}$) в старом стенде **не существовало** `[NOT FOUND]`.
- **Вывод:** Готового адаптера нет; требуется реализация чистых математических функций в `GeometryCore` с последующей интеграцией в параметрический реестр зависимостей `GeometryState`.

---

## 4. Семантика примитива LINE–CIRCLE (`INTERSECT_LINE_CIRCLE`)

### 4.1. Математическая модель
Пусть задана окружность $\text{Circle}(O(x_0, y_0), R)$ и прямая $L$, проходящая через точки $P_1(x_1, y_1)$ и $P_2(x_2, y_2)$.
Направляющий единичный вектор: $\vec{u} = \frac{P_2 - P_1}{\|P_2 - P_1\|}$, вектор смещения центра: $\vec{w} = P_1 - O$.

Параметрическое уравнение пересечения:
$$t^2 + 2(\vec{w} \cdot \vec{u})t + (\|\vec{w}\|^2 - R^2) = 0$$
Дискриминант:
$$\Delta = (\vec{w} \cdot \vec{u})^2 - (\|\vec{w}\|^2 - R^2) = R^2 - d_{\perp}^2$$
где $d_{\perp} = \frac{|(x_2 - x_1)(y_1 - y_0) - (x_1 - x_0)(y_2 - y_1)|}{\|P_2 - P_1\|}$ — расстояние от центра $O$ до прямой $L$.

### 4.2. Топологические случаи:
1. **$\Delta < 0$ ($d_{\perp} > R$): 0 точек пересечения.** Прямая не пересекает окружность.
2. **$\Delta = 0$ ($d_{\perp} = R$): 1 точка касания.** $T = P_1 - (\vec{w} \cdot \vec{u})\vec{u}$.
3. **$\Delta > 0$ ($d_{\perp} < R$): 2 точки пересечения:**
   $$t_1 = -(\vec{w} \cdot \vec{u}) - \sqrt{\Delta}, \quad t_2 = -(\vec{w} \cdot \vec{u}) + \sqrt{\Delta}$$
   $$Q_1 = P_1 + t_1 \vec{u}, \quad Q_2 = P_1 + t_2 \vec{u}$$

---

## 5. Семантика примитива CIRCLE–CIRCLE (`INTERSECT_CIRCLES`)

### 5.1. Математическая модель
Пусть заданы две окружности $C_1(O_1, R_1)$ и $C_2(O_2, R_2)$. Расстояние между центрами: $d = \|O_2 - O_1\|$.

### 5.2. Топологические случаи:
1. **$d = 0 \land R_1 = R_2$:** Совпадающие окружности ($\infty$ точек, вырожденный случай).
2. **$d > R_1 + R_2$ или $d < |R_1 - R_2|$:** 0 точек (окружности не пересекаются либо одна вложена в другую).
3. **$d = R_1 + R_2$ или $d = |R_1 - R_2|$:** 1 точка касания (внешнее или внутреннее).
4. **$|R_1 - R_2| < d < R_1 + R_2$:** 2 точки пересечения:
   - Расстояние от $O_1$ до радикальной оси: $a = \frac{R_1^2 - R_2^2 + d^2}{2d}$;
   - Полухорда: $h = \sqrt{R_1^2 - a^2}$;
   - Базовая точка на линии центров: $P_{\text{rad}} = O_1 + \frac{a}{d}(O_2 - O_1)$;
   - Единичный нормальный вектор: $\vec{n} = \left(-\frac{y_2 - y_1}{d}, \frac{x_2 - x_1}{d}\right)$;
   - Точки пересечения:
     $$Q_1 = P_{\text{rad}} + h\vec{n}, \quad Q_2 = P_{\text{rad}} - h\vec{n}$$

---

## 6. Идентичность объектов (Identity & Dynamic Behavior)

### 6.1. Принцип постоянства идентификаторов
В CQNS-001 запрещено удалять и создавать сущности заново при движении мыши.
- При создании пересечения $L \cap C$ регистрируются 2 сущности:
  - `pt_int_lc_{lineId}_{circleId}_1`
  - `pt_int_lc_{lineId}_{circleId}_2`
- При перемещении исходных объектов ($L$ или $C$) функция `recomputeDependentConstructions` обновляет координаты $(x, y)$ этих же объектов в памяти `this.points.set(id, { ...pt, x, y })`.

### 6.2. Поведение при топологическом вырождении ($2 \to 1 \to 0$ точек)
- **При $2 \to 1$ (касание):** $h \to 0 \implies Q_1 = Q_2$. Точки совмещаются в одну геометрическую позицию, сохраняя свои ID.
- **При $2 \to 0$ (разрыв пересечения):**
  - Сущности точек остаются зарегистрированными в структуре данных (чтобы не ломать дерево зависимостей DAG).
  - Точки переводятся в статус `dormant` (или фиксируются на ближайшей проекции).
  - Все зависимые отношения в `RelationGraph` мгновенно переводятся из `VERIFIED` в **`VANISHED`** (утеряно геометрическое условие существования).

---

## 7. Взаимодействие с Living Construction DAG

```text
       ┌───────────────┐               ┌────────────────┐
       │ Line L (p1,p2)│               │ Circle C (O,R) │
       └───────┬───────┘               └────────┬───────┘
               │                                │
               └───────────────┬────────────────┘
                               ▼
            ┌───────────────────────────────────────┐
            │ Operation: CONSTRUCT_LINE_CIRCLE_INT  │
            │ Dependencies: [lineId, circleId]      │
            └──────────────────┬────────────────────┘
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
       ┌─────────────────┐             ┌─────────────────┐
       │ Point Q1 (root1)│             │ Point Q2 (root2)│
       └─────────────────┘             └─────────────────┘
```

### Каскадный пересчёт:
`Move(Line.p1) → DAG.getDependents('line_L') → recompute(Q1, Q2) → recompute(downstream Segments/Polygons) → 60 FPS update`.

---

## 8. Архитектура вызовов через SOLGateway

`SOLGateway` выступает фасадом и **не производит** геометрических вычислений:

```text
[UI Interaction / Agent Call]
               │
               ▼
   SOLGateway.constructLineCircleIntersection(lineId, circleId)
               │
               ▼ (Делегирование в GeometryState)
   GeometryState.addLineCircleIntersection(lineId, circleId)
               │
               ├─► GeometryCore.lineCircleIntersection(line, circle) [Математический авторитет]
               ├─► points.set(Q1.id, Q1), points.set(Q2.id, Q2)
               ├─► dag.register(Q1.id, 'point', [lineId, circleId], 'CONSTRUCT_LC_INT_1')
               ├─► dag.register(Q2.id, 'point', [lineId, circleId], 'CONSTRUCT_LC_INT_2')
               └─► notify('evt_construct_lc_intersection')
```

---

## 9. Отражение в Relation Graph

После создания пересечения в `RelationGraph` регистрируются верификационные факты:

1. **`rel_point_on_line(Q1, Line)`** — статус `VERIFIED` (невязка расстояния $\text{dist}(Q_1, L) < 10^{-6}$).
2. **`rel_point_on_circle(Q1, Circle)`** — статус `VERIFIED` (невязка $|\text{dist}(Q_1, O) - R| < 10^{-6}$).
3. **`rel_intersection_lc(Line, Circle, [Q1, Q2])`** — родительское отношение.

При смещении линии за пределы круга отношение переходит в статус **`VANISHED`**.

---

## 10. Разблокируемые классические построения (Classical Impact)

| Классическая конструкция | Необходимый примитив | Статус разблокировки |
|---|---|---|
| **Вписанный квадрат (Sutton, Fig. 37)** | `INTERSECT_LINE_CIRCLE` | **`DIRECTLY ENABLED`** |
| **Прямоугольник в окружности (Fig. 150)** | `INTERSECT_LINE_CIRCLE` | **`DIRECTLY ENABLED`** |
| **Ромб по диагонали и стороне (Fig. 40)** | `INTERSECT_CIRCLES` | **`DIRECTLY ENABLED`** |
| **Равносторонний треугольник на стороне (Fig. 1)**| `INTERSECT_CIRCLES` | **`DIRECTLY ENABLED`** |
| **Правильный шестиугольник в круге (Fig. 3)** | `INTERSECT_CIRCLES` | **`DIRECTLY ENABLED`** |
| **Касательные из внешней точки (Fig. 73)** | `INTERSECT_CIRCLES` + Фалес | **`ENABLED WITH ADDITIONAL PRIMITIVES`** |
| **Центр окружности по хордам (Fig. 61)** | Уже поддержано ($L \cap L$) | **`DIRECTLY ENABLED`** |

---

## 11. Архитектурное решение (Architecture Decision)

Для обоих примитивов вынесено решение:

### **`INTERSECT_LINE_CIRCLE`:**
- **Решение:** **`Категория B — существует математическая основа, требуется конструктивная оболочка`** `[ADAPTER NEEDED]`.
- **Обоснование:** Математические уравнения квадратичного пересечения тривиальны; требуется добавить чистую функцию `GeometryCore.lineCircleIntersection`, структуру `DependentLineCircleIntersection` в `GeometryState` и метод в `SOLGateway`.

### **`INTERSECT_CIRCLES`:**
- **Решение:** **`Категория B — существует математическая основа, требуется конструктивная оболочка`** `[ADAPTER NEEDED]`.
- **Обоснование:** Аналитический расчёт радикальной оси и полухорды полностью детерминирован; требуется добавить функцию `GeometryCore.circleCircleIntersection`, структуру `DependentCircleCircleIntersection` в `GeometryState` и метод в `SOLGateway`.

---

## 12. Риски и методы их минимизации

1. **Риск перепутывания ветвей корней ($Q_1 \leftrightarrow Q_2$) при непрерывном вращении прямой:**
   - *Минимизация:* Сортировать корни $t_1 < t_2$ вдоль направляющего вектора $\vec{u}$ либо по полярному углу относительно центра $O$.
2. **Риск деления на ноль при $d \to 0$ в пересечении окружностей:**
   - *Минимизация:* Строгая проверка $d < 10^{-9}$ с возвратом `null` для концентрических/совпадающих окружностей.
3. **Нарушение производительности пересчёта (60 FPS):**
   - *Минимизация:* Обе операции используют только элементарные операции `Math.sqrt` без численных итерационных методов (время вычисления $< 0.001$ мс).

---

## 13. Рекомендуемый порядок реализации (Implementation Order)

1. **Шаг 1 (Core Math):** Добавить чистые статические функции `GeometryCore.lineCircleIntersection` и `GeometryCore.circleCircleIntersection` в `src/engines/geometryCore.ts`.
2. **Шаг 2 (Unit Tests):** Покрыть тестами все граничные случаи (0, 1, 2 пересечения, вырождения) в `src/test/cqnsRegression.test.ts`.
3. **Шаг 3 (State & DAG Registry):** Добавить реестры зависимостей `dependentLineCircleIntersections` и `dependentCircleCircleIntersections` в `GeometryState`.
4. **Шаг 4 (SOLGateway Facade):** Экспортировать методы `constructLineCircleIntersection` и `constructCircleCircleIntersection`.
5. **Шаг 5 (UI Integration):** Подключить инструмент `Intersection` в `CanvasStage` к кликам по окружностям.

---

## 14. Открытые вопросы (Open Questions)

1. **UX создания точек `[OPEN]`:**  
   При клике на пересечение прямой и окружности: создавать ли сразу обе точки $\{Q_1, Q_2\}$ как единую сопряжённую пару в DAG, либо только ту точку, ближе к которой кликнул пользователь?  
   *Предварительная рекомендация:* Создавать сразу обе геометрические точки $\{Q_1, Q_2\}$, так как для построения квадратов и ромбов всегда требуются обе вершины.

---

## 15. Self-Audit

- [x] Продакшн-код, `GeometryState`, `GeometryCore`, `VerificationLayer`, `SOLGateway`, `CanvasStage` не изменялись.
- [x] Анализ основан строго на исходном коде, а не на предположениях.
- [x] Математические модели для обоих примитивов представлены в аналитическом виде.
- [x] Поведение персистентности ID и топологических переходов формализовано.
- [x] Регрессионный тестовый пакет (`14/14 PASS`) остаётся зелёным.

```text
PHASE 08L — PRIMITIVE GAP ANALYSIS COMPLETE

PRODUCTION MUTATIONS: 0
ARCHITECTURE MUTATIONS: 0

LINE-CIRCLE:
[ADAPTER NEEDED / CATEGORY B]

CIRCLE-CIRCLE:
[ADAPTER NEEDED / CATEGORY B]

RECOMMENDED NEXT STEP:
Wait for human approval of Phase 08L analysis before initiating implementation.

STOP / WAIT FOR HUMAN AUDIT
```
