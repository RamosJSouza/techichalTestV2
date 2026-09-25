import { useGetFeaturesQuery } from '../../store/api/apiSlice';

export interface EsgCarFeatureState {
  enabled: boolean;
  ready: boolean;
}

export function useEsgCarFeature(): EsgCarFeatureState {
  const { data, isError, isLoading, isFetching } = useGetFeaturesQuery();
  if (isError) {
    return { enabled: false, ready: true };
  }
  if (isLoading || (isFetching && data === undefined)) {
    return { enabled: false, ready: false };
  }
  return { enabled: data?.esgCarEnabled === true, ready: true };
}
