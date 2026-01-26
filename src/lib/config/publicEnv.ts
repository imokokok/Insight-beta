export const publicEnv = {
  get INSIGHT_ORACLE_ADDRESS() {
    return (process.env.NEXT_PUBLIC_INSIGHT_ORACLE_ADDRESS ?? '').trim();
  },
};
