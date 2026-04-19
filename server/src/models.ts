import mongoose, { Schema, model } from 'mongoose';
import type { AlertCondition, AlertScope, NotificationChannels } from './types';

export interface AlertRecord {
  symbol: string;
  coinName: string;
  condition: AlertCondition;
  target: number;
  scope: AlertScope;
  assetQuantity?: number;
  assetValueAtCreationInr?: number;
  assetValueAtCreationUsd?: number;
  priceAtCreationInr: number;
  priceAtCreationUsd: number;
  channels: NotificationChannels;
  active: boolean;
  triggered: boolean;
  createdAt: Date;
  updatedAt: Date;
  triggeredAt?: Date;
  triggerPriceInr?: number;
  triggerPriceUsd?: number;
}

export interface AlertHistoryRecord {
  alertId: string;
  symbol: string;
  coinName: string;
  condition: AlertCondition;
  target: number;
  triggerPriceInr: number;
  triggerPriceUsd: number;
  percentChangeFromCreation: number;
  message: string;
  deliveredToTelegram: boolean;
  deliveredToEmail: boolean;
  createdAt: Date;
}

const NotificationChannelsSchema = new Schema<NotificationChannels>(
  {
    telegram: { type: Boolean, default: false },
    email: { type: Boolean, default: false },
  },
  { _id: false }
);

const AlertSchema = new Schema<AlertRecord>(
  {
    symbol: { type: String, required: true, uppercase: true, index: true },
    coinName: { type: String, required: true },
    condition: {
      type: String,
      enum: ['above', 'below', 'change', 'percent', 'change_up', 'change_down', 'percent_up', 'percent_down'],
      required: true,
    },
    target: { type: Number, required: true, min: 0 },
    scope: {
      type: String,
      enum: ['market_price', 'holding_value'],
      default: 'market_price',
      required: true,
    },
    assetQuantity: { type: Number, min: 0 },
    assetValueAtCreationInr: { type: Number, min: 0 },
    assetValueAtCreationUsd: { type: Number, min: 0 },
    priceAtCreationInr: { type: Number, required: true },
    priceAtCreationUsd: { type: Number, required: true },
    channels: { type: NotificationChannelsSchema, required: true },
    active: { type: Boolean, default: true, index: true },
    triggered: { type: Boolean, default: false, index: true },
    triggeredAt: { type: Date },
    triggerPriceInr: { type: Number },
    triggerPriceUsd: { type: Number },
  },
  {
    timestamps: true,
  }
);

const AlertHistorySchema = new Schema<AlertHistoryRecord>(
  {
    alertId: { type: String, required: true, index: true },
    symbol: { type: String, required: true, uppercase: true, index: true },
    coinName: { type: String, required: true },
    condition: {
      type: String,
      enum: ['above', 'below', 'change', 'percent', 'change_up', 'change_down', 'percent_up', 'percent_down'],
      required: true,
    },
    target: { type: Number, required: true, min: 0 },
    triggerPriceInr: { type: Number, required: true },
    triggerPriceUsd: { type: Number, required: true },
    percentChangeFromCreation: { type: Number, required: true },
    message: { type: String, required: true },
    deliveredToTelegram: { type: Boolean, default: false },
    deliveredToEmail: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  {
    versionKey: false,
  }
);

export const AlertModel = model<AlertRecord>('Alert', AlertSchema);
export const AlertHistoryModel = model<AlertHistoryRecord>('AlertHistory', AlertHistorySchema);

export const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/cryptonova';
  await mongoose.connect(mongoUri);
};
