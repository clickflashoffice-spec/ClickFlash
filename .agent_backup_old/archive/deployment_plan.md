# Deployment Plan: High-Performance / Low-Cost Cloud

Optimized for **Maximum Speed** and **Minimal Cost** for 100GB+ photography assets.

## 🏗️ Architecture

- **Frontend**: Vercel (Next.js Global Edge).
- **Backend**: PocketBase on Hetzner Cloud (CX22).
- **Storage**: Cloudflare R2 (Zero Egress Fees).

## 🛠️ Provider Stack

- **Vercel**: $0 (Hobby Plan).
- **Hetzner**: ~$4/mo.
- **Cloudflare R2**: ~$0.015/GB (No Egress).

## 🚀 Speed Optimization

1. **Edge Caching**: Cloudflare CDN.
2. **Image Optimization**: Next.js 16 automatic resizing.
3. **Regional Proximity**: Hetzner Europe/Africa nodes.
