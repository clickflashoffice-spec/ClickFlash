import { Text, type TextProps } from 'react-native';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: 'text' | 'textSecondary' | 'tint' | 'success' | 'warning' | 'danger';
};

export function ThemedText({ style, className, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  let typeClassName = '';
  switch (type) {
    case 'small':
      typeClassName = 'text-sm leading-5 font-medium';
      break;
    case 'smallBold':
      typeClassName = 'text-sm leading-5 font-bold';
      break;
    case 'title':
      typeClassName = 'text-[48px] font-semibold leading-[52px]';
      break;
    case 'subtitle':
      typeClassName = 'text-[32px] leading-[44px] font-semibold';
      break;
    case 'link':
      typeClassName = 'text-sm leading-[30px]';
      break;
    case 'linkPrimary':
      typeClassName = 'text-sm leading-[30px] text-cyan-500';
      break;
    case 'code':
      typeClassName = 'font-mono font-medium text-xs android:font-bold';
      break;
    case 'default':
    default:
      typeClassName = 'text-base leading-6 font-medium';
      break;
  }

  let colorClassName = 'text-slate-50';
  if (themeColor === 'textSecondary') colorClassName = 'text-slate-400';
  if (themeColor === 'tint') colorClassName = 'text-cyan-500';
  if (themeColor === 'success') colorClassName = 'text-emerald-500';
  if (themeColor === 'warning') colorClassName = 'text-amber-500';
  if (themeColor === 'danger') colorClassName = 'text-red-500';

  return (
    <Text
      className={`${colorClassName} ${typeClassName} ${className || ''}`}
      style={style}
      {...rest}
    />
  );
}
