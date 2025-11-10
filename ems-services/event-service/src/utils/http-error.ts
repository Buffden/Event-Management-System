export interface HttpError extends Error {
  status: number;
  expose?: boolean;
}

export const httpError = (status: number, message: string): HttpError => {
  const error = new Error(message) as HttpError;
  error.status = status;
  error.expose = true;
  return error;
};
