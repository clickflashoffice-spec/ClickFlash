import React from "react";
import Link from "next/link";
import NextImage from "next/image";
import type { Metadata } from "next";
import { createPageMetadata } from "../metadata";
import { blogPosts, categories } from "@/data/blogPosts";
import { InstagramFeed } from "@/components/sections/InstagramFeed";

export const metadata: Metadata = createPageMetadata({
  title: "Photography Blog - Wedding & Portrait Tips",
  description: "Expert photography tips, wedding planning guides, and destination wedding advice from ClickFlash professional photographers.",
  path: "/blog",
});

function getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
}

export default function BlogPage() {
    return (
        <main className="min-h-screen bg-white pt-24 md:pt-28 lg:pt-32 pb-12 md:pb-16">
            {/* Hero Section */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 md:mb-12">
                <div className="text-center">
                    <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700 mb-3 md:mb-4 block">
                        Our Blog
                    </span>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light text-slate-900 mb-4 tracking-tight">
                        Photography <span className="font-medium">Insights</span>
                    </h1>
                    <p className="text-slate-600 max-w-2xl mx-auto text-base md:text-lg">
                        Expert tips, guides, and inspiration for weddings, portraits, and travel photography in Tunisia and beyond.
                    </p>
                </div>
            </section>

            {/* Categories */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 md:mb-12">
                <div className="flex flex-wrap gap-2 md:gap-3 justify-center">
                    {categories.map((category) => (
                        <Link
                            key={category}
                            href={category === "All" ? "/blog" : `/blog/category/${category.toLowerCase().replace(/\s+/g, "-")}`}
                            className="px-4 md:px-6 py-2 text-xs md:text-sm font-medium transition-all duration-300 border rounded-full bg-white text-slate-600 border-slate-200 hover:border-cyan-500 hover:text-cyan-700"
                        >
                            {category}
                        </Link>
                    ))}
                </div>
            </section>

            {/* Featured Post */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 md:mb-16">
                <Link href={`/blog/${blogPosts[0].slug}`} className="group block">
                    <div className="grid md:grid-cols-2 gap-6 md:gap-8 bg-slate-50 rounded-2xl overflow-hidden">
                        <div className="aspect-[4/3] md:aspect-auto relative overflow-hidden">
                            <NextImage
                                src={blogPosts[0].image}
                                alt={blogPosts[0].title}
                                fill
                                className="object-cover transition-transform duration-700 group-hover:scale-105"
                                priority
                            />
                        </div>
                        <div className="p-6 md:p-8 lg:p-12 flex flex-col justify-center">
                            <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700 mb-3">
                                {blogPosts[0].category}
                            </span>
                            <h2 className="text-2xl md:text-3xl lg:text-4xl font-medium text-slate-900 mb-4 group-hover:text-cyan-700 transition-colors leading-tight">
                                {blogPosts[0].title}
                            </h2>
                            <p className="text-slate-600 mb-4 md:mb-6 line-clamp-3">
                                {blogPosts[0].excerpt}
                            </p>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                                <span>{blogPosts[0].author}</span>
                                <span>•</span>
                                <span>{blogPosts[0].readTime}</span>
                            </div>
                        </div>
                    </div>
                </Link>
            </section>

            {/* Blog Grid */}
            <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 min-h-[400px]">
                <h2 className="text-xl md:text-2xl font-medium text-slate-900 mb-6 md:mb-8">Latest Articles</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {blogPosts.slice(1).map((post) => (
                        <Link
                            key={post.slug}
                            href={`/blog/${post.slug}`}
                            className="group flex flex-col bg-white overflow-hidden transition-all duration-300"
                        >
                            {/* Image Container */}
                            <div className="aspect-[4/3] relative overflow-hidden bg-slate-100 mb-4 md:mb-6 rounded-xl">
                                <NextImage
                                    src={post.image}
                                    alt={post.title}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                            </div>

                            {/* Content */}
                            <div className="flex flex-col">
                                {/* Tag */}
                                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700 mb-2">
                                    {post.category}
                                </span>

                                {/* Title */}
                                <h3 className="text-lg md:text-xl font-medium text-slate-900 group-hover:text-cyan-700 transition-colors leading-snug mb-3">
                                    {post.title}
                                </h3>

                                {/* Excerpt */}
                                <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                                    {post.excerpt}
                                </p>

                                {/* Meta */}
                                <div className="flex items-center gap-3 text-xs text-slate-600 mt-auto">
                                    <span>{getTimeAgo(post.date)}</span>
                                    <span>•</span>
                                    <span>{post.readTime}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>

            {/* INSTAGRAM FEED */}
            <InstagramFeed
                title={<>Our <span className="text-cyan-700">Live Feed</span></>}
                subtitle="Instagram Updates"
            />

            {/* Newsletter CTA */}
            <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 md:mt-24 mb-8 md:mb-12">
                <div className="bg-slate-50 p-8 md:p-12 text-center relative overflow-hidden border border-slate-100 rounded-2xl">
                    <h2 className="text-2xl md:text-3xl font-light text-slate-900 mb-4 tracking-tight">
                        Subscribe to Our <span className="font-medium text-cyan-700">Newsletter</span>
                    </h2>
                    <p className="text-slate-600 mb-6 md:mb-8 font-normal text-sm md:text-base px-2">
                        Get photography tips and exclusive offers delivered to your inbox.
                    </p>
                    <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto px-2">
                        <input
                            type="email"
                            placeholder="Enter your email"
                            className="flex-1 px-4 md:px-6 py-3 md:py-4 bg-white border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all rounded-lg text-sm md:text-base"
                        />
                        <button
                            type="submit"
                            className="bg-cyan-700 text-white font-medium py-3 md:py-4 px-6 md:px-8 hover:bg-slate-900 transition-all rounded-lg text-sm md:text-base"
                        >
                            Subscribe
                        </button>
                    </form>
                </div>
            </section>
        </main>
    );
}
