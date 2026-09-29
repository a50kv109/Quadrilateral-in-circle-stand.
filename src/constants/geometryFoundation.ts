/**
 * CQNS-001: Mathematical Constants, Formulas & Invariants Foundation (Package 00)
 * Reference Layer: Scale-independent mathematical constants and pure helper formulas.
 * STRICTLY NON-AUTHORITATIVE: Does not determine cyclicity, create VERIFIED facts, or mutate state.
 */

/**
 * Отношение площади вписанного квадрата к площади описанной окружности:
 * A_square / A_circle = (2 * R^2) / (π * R^2) = 2 / π ≈ 0.6366197723675814
 */
export const SQUARE_TO_CIRCLE_AREA_RATIO = 2 / Math.PI;

/**
 * Отношение радиуса описанной окружности к апофеме вписанного квадрата:
 * R / d_apothem = R / (R * √2 / 2) = √2 ≈ 1.4142135623730951
 */
export const RADIUS_TO_APOTHEM_RATIO = Math.SQRT2;

/**
 * Фундаментальная функция хорды для окружности радиуса R и центрального угла θ (в радианах):
 * L(θ) = 2R * sin(θ / 2)
 *
 * Архитектурный контракт и семантика ошибок:
 * - Выполняет строгую валидацию входных параметров (fail-fast).
 * - Запрещено тихо возвращать 0 при неверном радиусе или выходе угла за границы [0, 2π],
 *   так как это маскирует повреждение входных геометрических данных.
 *
 * @throws {RangeError} Если radius <= 0 или не является конечным положительным числом.
 * @throws {RangeError} Если thetaRad < 0, thetaRad > 2π или не является конечным числом.
 */
export function calculateChordLength(thetaRad: number, radius: number): number {
  if (!Number.isFinite(radius) || radius <= 0) {
    throw new RangeError(
      `calculateChordLength: radius must be a finite positive number, received ${radius}`
    );
  }

  if (!Number.isFinite(thetaRad) || thetaRad < 0 || thetaRad > 2 * Math.PI) {
    throw new RangeError(
      `calculateChordLength: thetaRad must be in domain [0, 2π], received ${thetaRad}`
    );
  }

  return 2 * radius * Math.sin(thetaRad / 2);
}
