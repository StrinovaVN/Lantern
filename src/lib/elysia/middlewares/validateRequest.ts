type ValidationResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

type StorageValueBody = {
  value: string;
};

const numericPattern = /^[+-]?([0-9]*\.)?[0-9]+$/;

function valid<T>(data: T): ValidationResult<T> {
  return {
    success: true,
    data
  };
}

function invalid<T>(error: string): ValidationResult<T> {
  return {
    success: false,
    error
  };
}

function validateUserId(userId: string | undefined): ValidationResult<string> {
  if (!userId) return invalid('user_id is required.');
  if (!numericPattern.test(userId)) return invalid('user_id must be a number.');
  if (userId.length < 17 || userId.length > 19) return invalid('user_id must be 17-19 characters long.');

  return valid(userId);
}

function validateStorageKey(key: string | undefined): ValidationResult<string> {
  if (!key) return invalid('key is required.');
  if (typeof key !== 'string') return invalid('key must be a string.');
  if (key.length < 1 || key.length > 255) return invalid('key must be 1-255 characters long.');
  if (!/^[a-zA-Z0-9]+$/.test(key)) return invalid('key must be alphanumeric.');

  return valid(key);
}

function validateStorageValue(body: unknown): ValidationResult<StorageValueBody> {
  if (!body || typeof body !== 'object' || !('value' in body)) return invalid('value is required.');

  const { value } = body as { value?: unknown };
  if (typeof value !== 'string') return invalid('value must be a string.');
  if (value.length > 30000) return invalid('value must not exceed 30,000 characters.');

  return valid({ value });
}

function validateBulkUserIds(request: Request): ValidationResult<string[]> {
  const userIds = new URL(request.url).searchParams.getAll('user_ids');

  if (!userIds.length) return invalid('user_ids is required.');
  if (userIds.length === 1) return invalid('user_ids must be an array.');
  if (!userIds.every(id => id.length >= 17 && id.length <= 19)) {
    return invalid('user_ids must be an array of strings with 17-19 characters long.');
  }
  if (userIds.length !== new Set(userIds).size) return invalid('user_ids must not contain duplicates.');

  return valid(userIds);
}

export {
  validateBulkUserIds,
  validateStorageKey,
  validateStorageValue,
  validateUserId
};
