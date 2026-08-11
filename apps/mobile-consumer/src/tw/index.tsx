import { useCssElement, useNativeVariable } from 'react-native-css';
import { Link as RouterLink } from 'expo-router';
import React from 'react';
import { View as RNView, Text as RNText, Pressable as RNPressable, ScrollView as RNScrollView, TextInput as RNTextInput } from 'react-native';

// @ts-ignore
export const Link = (props: any): any => useCssElement(RouterLink, props, { className: 'style' });

export const useCSSVariable = process.env.EXPO_OS !== 'web' ? useNativeVariable : (v: string) => `var(${v})`;

// @ts-ignore
export const View = (props: any): any => useCssElement(RNView, props, { className: 'style' });
// @ts-ignore
export const Text = (props: any): any => useCssElement(RNText, props, { className: 'style' });
// @ts-ignore
export const ScrollView = (props: any): any => useCssElement(RNScrollView, props, { className: 'style', contentContainerClassName: 'contentContainerStyle' });
// @ts-ignore
export const Pressable = (props: any): any => useCssElement(RNPressable, props, { className: 'style' });
// @ts-ignore
export const TextInput = (props: any): any => useCssElement(RNTextInput, props, { className: 'style' });
