/**
 * Delivery system types.
 *
 * Three delivery methods:
 * - pickup: self-pickup from tenant's points
 * - courier: manual courier by the business
 * - cdek: automated via CDEK API
 */

/** A single pickup point configured by the tenant */
export interface PickupPoint {
  id: string;
  name: string;
  address: string;
  city?: string;
  phone?: string;
  workingHours?: string;
  lat?: number;
  lng?: number;
}

/** Courier delivery config */
export interface CourierConfig {
  /** Fixed price for courier delivery */
  price: number;
  /** Free delivery threshold (0 = never free) */
  freeFrom: number;
  /** Estimated delivery time label */
  estimatedTime: string;
  /** Delivery zone description */
  zone?: string;
}

/** CDEK integration config */
export interface CdekConfig {
  /** CDEK API account (client_id) */
  clientId: string;
  /** CDEK API secret */
  clientSecret: string;
  /** Test mode */
  testMode: boolean;
  /** Sender city CDEK code (e.g. 44 for Moscow) */
  senderCityCode: number;
  /** Default tariff codes to offer */
  tariffCodes: number[];
}

/** Delivery configuration stored in tenant.config.delivery */
export interface TenantDeliveryConfig {
  /** Enabled delivery methods */
  methods: DeliveryMethodType[];
  /** Pickup points (for 'pickup' method) */
  pickupPoints?: PickupPoint[];
  /** Courier config (for 'courier' method) */
  courier?: CourierConfig;
  /** CDEK config (for 'cdek' method) */
  cdek?: CdekConfig;
}

export type DeliveryMethodType = 'pickup' | 'courier' | 'cdek';

/** A calculated delivery option shown to user */
export interface DeliveryOption {
  id: string;
  type: DeliveryMethodType;
  name: string;
  description: string;
  price: number;
  estimatedDays?: string;
  /** For pickup: the selected point */
  pickupPoint?: PickupPoint;
  /** For CDEK: tariff info */
  cdekTariffCode?: number;
}

/** What gets saved on the order */
export interface OrderDeliveryInfo {
  method: DeliveryMethodType;
  price: number;
  /** For pickup: point ID */
  pickupPointId?: string;
  pickupPointName?: string;
  pickupPointAddress?: string;
  /** For CDEK: tracking */
  cdekTariffCode?: number;
  cdekOrderUuid?: string;
  trackingNumber?: string;
  /** Display label */
  estimatedDays?: string;
}
