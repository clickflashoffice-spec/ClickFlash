# Finding: Website Lacks Dark Mode Support

**Finding ID:** F-FEAT-003  
**Date:** 2026-04-08  
**App:** Main Website  
**Domain:** Features  
**Severity:** Low  

## Description

The Main Website does not have dark mode support.

**Evidence:**
- Search for `dark:` Tailwind classes in `apps/website/src` returned no results
- Master has 1618 dark mode class usages
- Website: 0 dark mode class usages

## Impact

Inconsistent user experience. Marketing website visible in low-light may cause poor impression.

## Recommendation

Add dark mode support following the pattern used in other apps.

## References

- F-03: Dark mode support

## Owner

Dev

## Status

Open
