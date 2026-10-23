export const calculateRetryDelay = (attemptNumber: number): number => {
  if (!Number.isInteger(attemptNumber) || attemptNumber < 1) {
    throw new Error("attemptNumber must be at least 1");
  }

  return 2 ** attemptNumber * 1000 + Math.floor(Math.random() * 1000);
};

