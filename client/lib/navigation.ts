import { createNavigationContainerRef, CommonActions } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/RootStackNavigator";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function rootNavigate<T extends keyof RootStackParamList>(
  name: T,
  ...args: RootStackParamList[T] extends undefined ? [params?: undefined] : [params: RootStackParamList[T]]
) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(
      CommonActions.navigate({
        name: name as string,
        params: args[0] as any,
      })
    );
  }
}
