import mongoose from "mongoose";

export function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

export function toObjectId(value) {
  if (!isValidObjectId(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

export function requireFields(payload = {}, requiredFields = []) {
  const missing = requiredFields.filter((field) => {
    const value = payload[field];
    return value === undefined || value === null || `${value}`.trim() === "";
  });
  return missing;
}

