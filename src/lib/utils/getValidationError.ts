import { Error as MongooseError } from 'mongoose';

type ValidatableDocument = {
  validateSync: () => MongooseError.ValidationError | null | undefined;
};

/**
 * Validates a given document and returns the first validation error message, if any.
 *
 * @param {ValidatableDocument} document - The document to validate.
 * @returns {string | null} - The first validation error message, or `null` if there are no errors.
 */
function getValidationError(document: ValidatableDocument): string | null {
  const errors = document.validateSync();
  if (errors) {
    const error = Object.values(errors.errors)[0];

    return error?.message || 'An unknown error occurred.';
  }

  return null;
}

export default getValidationError;