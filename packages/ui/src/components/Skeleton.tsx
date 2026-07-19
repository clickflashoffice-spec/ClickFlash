'use client';

import React, { memo } from 'react';
import { clsx } from 'clsx';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = memo(({ className, ...props }) => {
  return (
    <div
      className={clsx('animate-pulse rounded-md bg-zinc-200 dark:bg-zinc-800', className)}
      {...props}
    />
  );
});

Skeleton.displayName = 'Skeleton';

export default Skeleton;
