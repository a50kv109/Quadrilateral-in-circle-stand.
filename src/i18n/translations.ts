/**
 * CQNS-001 — Bilingual Localization (RU / EN)
 * Complete interface localization dictionary. Default language: RU.
 * Mathematical designations (A, B, C, D, O, R, AC, BD, S¹) are preserved.
 */

export type Language = 'ru' | 'en';

export interface TranslationDictionary {
  appTitle: string;
  appSubtitle: string;
  canonTag: string;
  architectureTag: string;

  // Header and mode toggles
  modeCanonical: string;
  modeExtension: string;
  modeCanonicalDesc: string;
  modeExtensionDesc: string;
  modeSchool: string;
  modeResearch: string;
  modeSchoolDesc: string;
  modeResearchDesc: string;
  badgeSchool: string;
  badgeResearch: string;
  resetCanon: string;
  verify: string;
  stateVerified: string;
  stateVanished: string;
  stateInvalid: string;

  // Toolbar toggles & options
  degreeScale: string;
  gridToggle: string;
  constrainToCircle: string;
  tooltipsDragHint: string;
  toolInstructionPrefix: string;

  // Tool names
  toolSelect: string;
  toolMove: string;
  toolPoint: string;
  toolSegment: string;
  toolLine: string;
  toolCircle: string;
  toolAngle: string;
  toolRuler: string;
  toolCompass: string;
  toolDiagonals: string;
  toolDiagAC: string;
  toolDiagBD: string;
  toolIntersection: string;
  toolParallel: string;
  toolPerpendicular: string;

  // Tool instructions / prompts
  instructionSelect: string;
  instructionMove: string;
  instructionPoint: string;
  instructionSegment: string;
  instructionLine: string;
  instructionCircle: string;
  instructionAngle: string;
  instructionRuler: string;
  instructionCompass: string;
  instructionDiagonals: string;
  instructionIntersection: string;
  instructionParallel: string;
  instructionPerpendicular: string;
  toolParallelActiveSource: string;
  toolPerpActiveSource: string;
  hoverToSelectSource: string;
  activeSourceBadge: string;
  snapToPoint: string;
  snapToCircle: string;
  newPointPlacement: string;
  cancel: string;

  // Construction panel
  panelTitle: string;
  panelSubtitle: string;
  tabStatus: string;
  tabPrimitives: string;
  tabLedger: string;
  tabPassport: string;
  tabSummary: string;
  tabArcsChords: string;
  tabRelationMap: string;
  tabTheorems: string;

  // Geometry Summary & Arc/Chord translations
  summaryOverallTitle: string;
  summaryRadius: string;
  summaryDiameter: string;
  summaryPerimeter: string;
  summaryArea: string;
  summaryAreaGap: string;
  summaryOrientation: string;

  diagonalsTitle: string;
  diagNotConstructed: string;

  relationMapTitle: string;

  tableChordHeader: string;
  tableArcHeader: string;
  tableAngleHeader: string;
  tableLengthHeader: string;

  // Inspection cards
  cyclicQuadTitle: string;
  cyclicQuadVerifiedDesc: string;
  cyclicQuadVanishedDesc: string;

  oppAnglesTitle: string;
  oppAnglesDesc: string;
  oppAnglesRule: string;

  ptolemyTitle: string;
  ptolemyNeedsDiags: string;
  ptolemyDiagProduct: string;
  ptolemySideSum: string;
  ptolemyDelta: string;
  ptolemyRule: string;

  // Auxiliary construction section
  auxSectionTitle: string;
  btnBothDiagonals: string;
  btnBothDiagonalsDone: string;
  btnAddDiagAC: string;
  btnAddDiagACDone: string;
  btnAddDiagBD: string;
  btnAddDiagBDDone: string;
  btnConstructIntersection: string;
  btnConstructIntersectionDone: string;
  btnConstructParallel: string;
  btnConstructPerpendicular: string;

  // Acceptance testing section
  acceptanceSectionTitle: string;
  btnTestVanished: string;
  btnRestoreD: string;
  btnRunVerification: string;
  btnResetCanonical: string;

  // Primitives tab
  circumcircleTitle: string;
  centerTitle: string;
  canonicalVerticesTitle: string;
  onCircleLabel: string;
  offCircleLabel: string;

  // Ledger tab
  ledgerHint: string;
  originLabel: string;
  stateVersionLabel: string;

  // Measure / Ruler overlay
  rulerMeasurement: string;
  rulerClickFirst: string;
  rulerClickSecond: string;

  // Degree readout
  degreeLabel: string;
}

export const translations: Record<Language, TranslationDictionary> = {
  ru: {
    appTitle: 'CQNS-001',
    appSubtitle: 'Стенд нормализации вписанного четырёхугольника',
    canonTag: 'Канон: Окружность(O, R), A,B,C,D ∈ S¹',
    architectureTag: 'Геометрический исследовательский стенд',

    modeCanonical: 'Канонический',
    modeExtension: 'Расширенный',
    modeCanonicalDesc: 'Строгий канон: 4 вершины на окружности',
    modeExtensionDesc: 'Свободное перемещение и вспомогательные построения',
    modeSchool: 'Школьный режим',
    modeResearch: 'Исследовательский режим',
    modeSchoolDesc: 'Школьный режим: вершины жестко скользят по окружности S¹, сохраняя цикличность (VERIFIED)',
    modeResearchDesc: 'Исследовательский режим: свободное перемещение по плоскости для тестирования нарушения цикличности (VANISHED)',
    badgeSchool: 'Школьный режим (S¹)',
    badgeResearch: 'Исследовательский режим (R²)',
    resetCanon: 'Сброс к канону',
    verify: 'Проверить',
    stateVerified: 'Цикличность: VERIFIED',
    stateVanished: 'Цикличность: VANISHED (Точка вне окружности)',
    stateInvalid: 'Цикличность: INVALID (Нарушение геометрии)',

    degreeScale: 'Градусная шкала 0°..360°',
    gridToggle: 'Сетка',
    constrainToCircle: 'Привязка вершин к окружности (S¹)',
    tooltipsDragHint: 'Перетаскивайте вершины мышью для проверки перехода инвариантов',
    toolInstructionPrefix: 'Инструмент',

    toolSelect: 'Выбор',
    toolMove: 'Перемещение',
    toolPoint: 'Точка',
    toolSegment: 'Отрезок',
    toolLine: 'Прямая',
    toolCircle: 'Окружность',
    toolAngle: 'Угол',
    toolRuler: 'Линейка',
    toolCompass: 'Циркуль',
    toolDiagonals: 'Диагонали',
    toolDiagAC: 'Диагональ AC',
    toolDiagBD: 'Диагональ BD',
    toolIntersection: 'Пересечение диагоналей',
    toolParallel: 'Параллельная',
    toolPerpendicular: 'Перпендикулярная',

    instructionSelect: 'Режим выбора: кликните по объекту для инспекции',
    instructionMove: 'Перемещение: перетаскивайте точки A, B, C, D или вспомогательные элементы',
    instructionPoint: 'Кликните на холсте для добавления новой точки',
    instructionSegment: 'Выберите две точки для построения отрезка',
    instructionLine: 'Выберите две точки для проведения прямой',
    instructionCircle: 'Выберите центр и радиус (кликните центр, затем радиус)',
    instructionAngle: 'Выберите 3 точки вершины для измерения угла',
    instructionRuler: 'Линейка: кликните первую точку, затем вторую для измерения расстояния',
    instructionCompass: 'Циркуль: построение окружности заданного радиуса',
    instructionDiagonals: 'Построение обеих диагоналей AC и BD в четырёхугольнике ABCD',
    instructionIntersection: 'Регистрация точки пересечения P = AC ∩ BD',
    instructionParallel: 'Параллельная: наведите курсор на отрезок для выбора основы',
    instructionPerpendicular: 'Перпендикуляр: наведите курсор на отрезок для выбора основы',
    toolParallelActiveSource: 'Основа: {seg} (∥). Перемещайте мышь для предпросмотра, кликните для фиксации точки (или привязка snap)',
    toolPerpActiveSource: 'Основа: {seg} (⟂). Перемещайте мышь для предпросмотра, кликните для фиксации точки (или привязка snap)',
    hoverToSelectSource: 'Наведите на отрезок для выбора основы',
    activeSourceBadge: 'Основа',
    snapToPoint: 'Привязка к точке',
    snapToCircle: 'Привязка к окружности S¹',
    newPointPlacement: 'Новая точка',
    cancel: 'Отмена (Esc)',

    panelTitle: 'Панель CQNS-001',
    panelSubtitle: 'Инспекция четырёхугольника и инвариантов',
    tabStatus: 'Статусы и теоремы',
    tabPrimitives: 'Примитивы',
    tabLedger: 'Граф отношений',
    tabPassport: 'Паспорт',
    tabSummary: 'Сводка',
    tabArcsChords: 'Дуги/Хорды',
    tabRelationMap: 'Карта связей',
    tabTheorems: 'Теоремы',

    summaryOverallTitle: 'Общая геометрия',
    summaryRadius: 'Радиус R',
    summaryDiameter: 'Диаметр D',
    summaryPerimeter: 'Периметр P',
    summaryArea: 'Площадь S',
    summaryAreaGap: 'N/A (Gap в Engine)',
    summaryOrientation: 'Ориентация',

    diagonalsTitle: 'Диагонали AC и BD',
    diagNotConstructed: 'Не построена',

    relationMapTitle: 'Соответствие: Вершина → Противоположная дуга/хорда',

    tableChordHeader: 'Хорда',
    tableArcHeader: 'Дуга',
    tableAngleHeader: 'Центр. угол θ',
    tableLengthHeader: 'Длина L',

    cyclicQuadTitle: 'Вписанный четырёхугольник ABCD',
    cyclicQuadVerifiedDesc: 'Все 4 вершины A, B, C, D лежат на окружности Circle(O, R). Верифицировано по Контракту VC-03.',
    cyclicQuadVanishedDesc: 'Утерян prerequisite: одна или несколько вершин выведены за окружность. Объект существует в памяти, отношение перешло в статус VANISHED.',

    oppAnglesTitle: 'Теорема о сумме противоположных углов',
    oppAnglesDesc: 'Сумма противоположных углов вписанного четырёхугольника равна 180° (Контракт VC-11).',
    oppAnglesRule: 'Правило: ∠A + ∠C = 180° и ∠B + ∠D = 180°',

    ptolemyTitle: 'Метрический инвариант Птолемея',
    ptolemyNeedsDiags: 'Для расчёта необходимо построить обе диагонали AC и BD (Контракт VC-14).',
    ptolemyDiagProduct: 'Произведение диагоналей AC · BD:',
    ptolemySideSum: 'Сумма произведений сторон AB·CD + BC·DA:',
    ptolemyDelta: 'Невязка (|Δ|):',
    ptolemyRule: 'Правило: AC · BD = AB · CD + BC · DA (выводится как DERIVED при активных диагоналях)',

    auxSectionTitle: 'Вспомогательные построения (SOL Gateway)',
    btnBothDiagonals: 'Построить обе диагонали (AC и BD)',
    btnBothDiagonalsDone: 'Обе диагонали построены',
    btnAddDiagAC: 'Диагональ AC',
    btnAddDiagACDone: 'Диагональ AC построена',
    btnAddDiagBD: 'Диагональ BD',
    btnAddDiagBDDone: 'Диагональ BD построена',
    btnConstructIntersection: 'Построить пересечение P (AC ∩ BD)',
    btnConstructIntersectionDone: 'Точка P = AC ∩ BD зарегистрирована',
    btnConstructParallel: 'Параллельная прямая через P к AB',
    btnConstructPerpendicular: 'Перпендикуляр через P к AB',

    acceptanceSectionTitle: 'Действия приёмочного тестирования',
    btnTestVanished: '1. Сместить D с окружности (Тест VANISHED)',
    btnRestoreD: '2. Вернуть D на окружность (Координаты)',
    btnRunVerification: '3. Запустить проверку контрактов (Verify)',
    btnResetCanonical: 'Сброс к канонической конфигурации',

    circumcircleTitle: 'Описанная окружность: Circle(O, R)',
    centerTitle: 'Центр: O (0, 0)',
    canonicalVerticesTitle: 'Канонические вершины',
    onCircleLabel: 'НА ОКРУЖНОСТИ',
    offCircleLabel: 'ВНЕ ОКРУЖНОСТИ',

    ledgerHint: 'Граф отношений — строго пассивный эпистемический реестр. Все факты утверждаются Верификационным слоем.',
    originLabel: 'Происхождение:',
    stateVersionLabel: 'Версия состояния:',

    rulerMeasurement: 'Расстояние между точками:',
    rulerClickFirst: 'Линейка: выберите первую точку',
    rulerClickSecond: 'Линейка: выберите вторую точку',

    degreeLabel: 'Угол',
  },

  en: {
    appTitle: 'CQNS-001',
    appSubtitle: 'Cyclic Quadrilateral Normalization Stand',
    canonTag: 'Canon: Circle(O, R), A,B,C,D ∈ S¹',
    architectureTag: 'Geometry Reasoning Architecture',

    modeCanonical: 'Canonical',
    modeExtension: 'Extension',
    modeCanonicalDesc: 'Strict canon: 4 vertices concyclic on Circle(O, R)',
    modeExtensionDesc: 'Exploratory movement and auxiliary constructions',
    modeSchool: 'School Mode',
    modeResearch: 'Research Mode',
    modeSchoolDesc: 'School Mode: vertices slide strictly along Circle S¹, preserving cyclicity (VERIFIED)',
    modeResearchDesc: 'Research Mode: unconstrained planar movement to test cyclicity violations (VANISHED)',
    badgeSchool: 'School Mode (S¹)',
    badgeResearch: 'Research Mode (R²)',
    resetCanon: 'Reset Canon',
    verify: 'Verify',
    stateVerified: 'Cyclic State: VERIFIED',
    stateVanished: 'Cyclic State: VANISHED (Vertex off circle)',
    stateInvalid: 'Cyclic State: INVALID (Geometry violation)',

    degreeScale: 'Degree Scale 0°..360°',
    gridToggle: 'Grid',
    constrainToCircle: 'Constrain drag to Circle (S¹)',
    tooltipsDragHint: 'Drag vertices to test real-time invariant transitions',
    toolInstructionPrefix: 'Tool',

    toolSelect: 'Select',
    toolMove: 'Move',
    toolPoint: 'Point',
    toolSegment: 'Segment',
    toolLine: 'Line',
    toolCircle: 'Circle',
    toolAngle: 'Angle',
    toolRuler: 'Ruler',
    toolCompass: 'Compass',
    toolDiagonals: 'Diagonals',
    toolDiagAC: 'Diagonal AC',
    toolDiagBD: 'Diagonal BD',
    toolIntersection: 'Intersection',
    toolParallel: 'Parallel',
    toolPerpendicular: 'Perpendicular',

    instructionSelect: 'Select mode: click any entity to inspect',
    instructionMove: 'Move mode: drag vertices A, B, C, D or auxiliary objects',
    instructionPoint: 'Click on the canvas to add a new point',
    instructionSegment: 'Click two points to construct a segment',
    instructionLine: 'Click two points to draw a line',
    instructionCircle: 'Click center, then point for radius to draw a circle',
    instructionAngle: 'Click 3 vertex points to measure angle',
    instructionRuler: 'Ruler: click first point, then second point to measure distance',
    instructionCompass: 'Compass: construct circle with given radius',
    instructionDiagonals: 'Construct both diagonals AC and BD in quadrilateral ABCD',
    instructionIntersection: 'Register intersection point P = AC ∩ BD',
    instructionParallel: 'Parallel: hover over a segment to select reference source',
    instructionPerpendicular: 'Perpendicular: hover over a segment to select reference source',
    toolParallelActiveSource: 'Source: {seg} (∥). Move mouse for preview, click to place line (or snap to point)',
    toolPerpActiveSource: 'Source: {seg} (⟂). Move mouse for preview, click to place line (or snap to point)',
    hoverToSelectSource: 'Hover over segment to select source line',
    activeSourceBadge: 'Source',
    snapToPoint: 'Snap to point',
    snapToCircle: 'Snap to circle S¹',
    newPointPlacement: 'New point',
    cancel: 'Cancel (Esc)',

    panelTitle: 'CQNS-001 Stand',
    panelSubtitle: 'Cyclic Quadrilateral Normalization',
    tabStatus: 'Status & Theorems',
    tabPrimitives: 'Primitives',
    tabLedger: 'Relation Graph',
    tabPassport: 'Passport',
    tabSummary: 'Summary',
    tabArcsChords: 'Arcs & Chords',
    tabRelationMap: 'Relation Map',
    tabTheorems: 'Theorems',

    summaryOverallTitle: 'Overall Geometry',
    summaryRadius: 'Radius R',
    summaryDiameter: 'Diameter D',
    summaryPerimeter: 'Perimeter P',
    summaryArea: 'Area S',
    summaryAreaGap: 'N/A (Engine Gap)',
    summaryOrientation: 'Orientation',

    diagonalsTitle: 'Diagonals AC and BD',
    diagNotConstructed: 'Not constructed',

    relationMapTitle: 'Mapping: Vertex → Opposite Arc / Chord',

    tableChordHeader: 'Chord',
    tableArcHeader: 'Arc',
    tableAngleHeader: 'Central Angle θ',
    tableLengthHeader: 'Length L',

    cyclicQuadTitle: 'Cyclic Quadrilateral ABCD',
    cyclicQuadVerifiedDesc: 'All 4 vertices A, B, C, D lie on Circle(O, R). Verified under Contract VC-03.',
    cyclicQuadVanishedDesc: 'Prerequisite lost: One or more vertices dragged off circumcircle. Object remains alive, relation is VANISHED.',

    oppAnglesTitle: 'Opposite Angles Theorem',
    oppAnglesDesc: 'Opposite angles of an inscribed quadrilateral sum to 180° (Contract VC-11).',
    oppAnglesRule: 'Rule: ∠A + ∠C = 180° and ∠B + ∠D = 180°',

    ptolemyTitle: 'Ptolemy Metric Invariant',
    ptolemyNeedsDiags: 'Both diagonals AC and BD must be constructed to evaluate Ptolemy (Contract VC-14).',
    ptolemyDiagProduct: 'Diagonal product AC · BD:',
    ptolemySideSum: 'Side product sum AB·CD + BC·DA:',
    ptolemyDelta: 'Deviation (|Δ|):',
    ptolemyRule: 'Rule: AC · BD = AB · CD + BC · DA (DERIVED when diagonals are active)',

    auxSectionTitle: 'Auxiliary Constructions (SOL Gateway)',
    btnBothDiagonals: 'Construct Both Diagonals (AC and BD)',
    btnBothDiagonalsDone: 'Both Diagonals Constructed',
    btnAddDiagAC: 'Diagonal AC',
    btnAddDiagACDone: 'Diagonal AC Added',
    btnAddDiagBD: 'Diagonal BD',
    btnAddDiagBDDone: 'Diagonal BD Added',
    btnConstructIntersection: 'Construct Intersection P (AC ∩ BD)',
    btnConstructIntersectionDone: 'Intersection P Registered',
    btnConstructParallel: 'Parallel line through P to AB',
    btnConstructPerpendicular: 'Perpendicular through P to AB',

    acceptanceSectionTitle: 'Acceptance Test Actions',
    btnTestVanished: '1. Drag D off Circle (Test VANISHED)',
    btnRestoreD: '2. Restore D on Circle (Coordinates)',
    btnRunVerification: '3. Run Verification Pass (Verify)',
    btnResetCanonical: 'Reset to Canonical State',

    circumcircleTitle: 'Circumcircle: Circle(O, R)',
    centerTitle: 'Center: O (0, 0)',
    canonicalVerticesTitle: 'Canonical Vertices',
    onCircleLabel: 'ON CIRCLE',
    offCircleLabel: 'OFF CIRCLE',

    ledgerHint: 'Relation Graph is a strictly passive epistemic ledger. Facts are validated by the Verification Layer.',
    originLabel: 'Origin:',
    stateVersionLabel: 'State version:',

    rulerMeasurement: 'Distance between points:',
    rulerClickFirst: 'Ruler: click first point',
    rulerClickSecond: 'Ruler: click second point',

    degreeLabel: 'Angle',
  },
};
