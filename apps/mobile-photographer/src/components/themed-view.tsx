import { View, type ViewProps } from 'react-native';

export type ThemedViewProps = ViewProps & {
  type?: 'background' | 'surface' | 'elevated' | 'backgroundElement' | 'backgroundSelected';
};

export function ThemedView({ style, className, type = 'background', ...otherProps }: ThemedViewProps) {
  let bgClassName = 'bg-[#070a12]';
  if (type === 'surface' || type === 'backgroundElement') bgClassName = 'bg-slate-900';
  if (type === 'elevated' || type === 'backgroundSelected') bgClassName = 'bg-slate-800';

  return <View className={`${bgClassName} ${className || ''}`} style={style} {...otherProps} />;
}
