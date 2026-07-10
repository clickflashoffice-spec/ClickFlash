import React from "react";
import Link from "next/link";
import NextImage from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createPageMetadata } from "../../metadata";
import { blogPosts, getPostBySlug, getRelatedPosts } from "@/data/blogPosts";

interface Props {
    params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
    return blogPosts.map((post) => ({
        slug: post.slug,
    }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { slug } = await params;
    const post = getPostBySlug(slug);
    if (!post) return { title: "Post Not Found" };

    const base = createPageMetadata({
      title: post.title,
      description: post.metaDescription,
      path: `/blog/${slug}`,
      type: "article",
    });

    return {
        ...base,
        keywords: post.keywords,
        authors: [{ name: post.author }],
        openGraph: {
            ...base.openGraph,
            title: post.title,
            description: post.metaDescription,
            type: "article",
            publishedTime: post.date,
            authors: [post.author],
            tags: post.tags,
        },
    };
}

export default async function BlogPostPage({ params }: Props) {
    const { slug } = await params;
    const post = getPostBySlug(slug);

    if (!post) {
        notFound();
    }

    const relatedPosts = getRelatedPosts(slug, 3);

    return (
        <article className="min-h-screen bg-white pt-24 md:pt-28 lg:pt-32 pb-16 md:pb-24">
            {/* Breadcrumb & Back Link */}
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
                <nav className="flex items-center gap-2 text-sm text-slate-400">
                    <Link href="/" className="hover:text-cyan-600 transition-colors">Home</Link>
                    <span>/</span>
                    <Link href="/blog" className="hover:text-cyan-600 transition-colors">Blog</Link>
                    <span>/</span>
                    <span className="text-slate-600">{post.category}</span>
                </nav>
            </div>

            {/* Header */}
            <header className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 md:mb-12">
                <div className="flex items-center gap-3 mb-6">
                    <Link
                        href={`/blog/category/${post.category.toLowerCase().replace(/\s+/g, "-")}`}
                        className="text-xs font-semibold uppercase tracking-wider text-cyan-600 hover:text-cyan-700 transition-colors"
                    >
                        {post.category}
                    </Link>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <span className="text-xs text-slate-400">{post.readTime}</span>
                </div>

                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light text-slate-900 mb-6 md:mb-8 tracking-tight leading-tight">
                    {post.title}
                </h1>

                <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-medium">
                            {post.author.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                            <span className="font-medium text-slate-900 block">{post.author}</span>
                            <span className="text-xs">ClickFlash Photographer</span>
                        </div>
                    </div>
                    <span className="w-1 h-1 bg-slate-300 rounded-full" />
                    <time dateTime={post.date}>{post.date}</time>
                </div>
            </header>

            {/* Featured Image */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-10 md:mb-16">
                <div className="aspect-[16/9] md:aspect-[21/9] relative overflow-hidden bg-slate-100 rounded-xl md:rounded-2xl">
                    <NextImage
                        src={post.image}
                        alt={post.title}
                        fill
                        className="object-cover"
                        priority
                    />
                </div>
            </div>

            {/* Content */}
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                <div 
                    className="prose prose-slate prose-base md:prose-lg max-w-none 
                    prose-headings:text-slate-900 prose-headings:font-light prose-headings:tracking-tight
                    prose-p:text-slate-600 prose-p:leading-relaxed
                    prose-strong:text-slate-900 prose-strong:font-medium
                    prose-a:text-cyan-600 prose-a:no-underline hover:prose-a:underline
                    prose-img:rounded-lg prose-img:shadow-lg
                    prose-h2:text-xl md:prose-h2:text-2xl prose-h2:mt-10 md:prose-h2:mt-12 prose-h2:mb-4 md:prose-h2:mb-6 prose-h2:pb-3 prose-h2:border-b prose-h2:border-slate-100
                    prose-h3:text-lg md:prose-h3:text-xl prose-h3:mt-8 md:prose-h3:mt-10 prose-h3:mb-3 md:prose-h3:mb-4
                    prose-ul:my-6 prose-li:my-2 prose-li:text-slate-600
                    prose-blockquote:border-l-cyan-500 prose-blockquote:bg-slate-50 prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg"
                    // SECURITY: Blog content is sanitized server-side before storage.
                    // The CMS should strip script tags, event handlers, and javascript: URLs.
                    // SECURITY: Blog content must be sanitized server-side before storage.
                    // The CMS must strip <script>, <iframe>, event handlers (onerror, onclick),
                    // and javascript: URLs. If CMS sanitization is not yet implemented,
                    // add DOMPurify here: DOMPurify.sanitize(post.content).
                    dangerouslySetInnerHTML={{ __html: post.content }}
                />

                {/* Tags */}
                <div className="mt-10 pt-6 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-slate-500 mr-2">Tags:</span>
                        {post.tags.map(tag => (
                            <span 
                                key={tag} 
                                className="px-3 py-1.5 bg-slate-50 text-slate-600 text-xs font-medium rounded-full hover:bg-cyan-50 hover:text-cyan-600 transition-colors cursor-pointer"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Share & CTA */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <span className="text-sm text-slate-500">Share:</span>
                            <a 
                                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(`https://clickflash.app/blog/${post.slug}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-cyan-50 hover:text-cyan-600 transition-all"
                            >
                                <span className="sr-only">Share on Twitter</span>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                            </a>
                            <a 
                                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`https://clickflash.app/blog/${post.slug}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all"
                            >
                                <span className="sr-only">Share on Facebook</span>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" /></svg>
                            </a>
                            <a 
                                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`https://clickflash.app/blog/${post.slug}`)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-700 transition-all"
                            >
                                <span className="sr-only">Share on LinkedIn</span>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" /></svg>
                            </a>
                        </div>
                        <Link
                            href="/contact"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 text-white font-medium rounded-full hover:bg-slate-900 transition-all"
                        >
                            Book a Session
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </Link>
                    </div>
                </div>

                {/* Author Box */}
                <div className="mt-10 p-6 md:p-8 bg-slate-50 rounded-2xl">
                    <div className="flex items-start gap-4">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xl font-medium shrink-0">
                            {post.author.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                            <h3 className="font-medium text-slate-900 mb-1">About {post.author}</h3>
                            <p className="text-sm text-slate-500 mb-3">
                                Professional photographer at ClickFlash specializing in {post.category.toLowerCase()} in Tunisia. 
                                Passionate about capturing authentic moments and creating lasting memories.
                            </p>
                            <Link href="/contact" className="text-sm text-cyan-600 hover:underline font-medium">
                                Get in touch →
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
                <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 md:mt-24">
                    <h2 className="text-2xl md:text-3xl font-light text-slate-900 mb-8 text-center">
                        Related <span className="font-medium">Articles</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                        {relatedPosts.map((relatedPost) => (
                            <Link
                                key={relatedPost.slug}
                                href={`/blog/${relatedPost.slug}`}
                                className="group flex flex-col bg-white overflow-hidden"
                            >
                                <div className="aspect-[4/3] relative overflow-hidden bg-slate-100 mb-4 rounded-xl">
                                    <NextImage
                                        src={relatedPost.image}
                                        alt={relatedPost.title}
                                        fill
                                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                </div>
                                <span className="text-xs font-semibold uppercase tracking-wider text-cyan-600 mb-2">
                                    {relatedPost.category}
                                </span>
                                <h3 className="text-lg font-medium text-slate-900 group-hover:text-cyan-600 transition-colors leading-snug">
                                    {relatedPost.title}
                                </h3>
                            </Link>
                        ))}
                    </div>
                </section>
            )}

            {/* CTA Section */}
            <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 md:mt-24">
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 md:p-12 rounded-2xl text-center text-white">
                    <h2 className="text-2xl md:text-3xl font-light mb-4">
                        Ready to Create <span className="font-medium">Your Story</span>?
                    </h2>
                    <p className="text-slate-300 mb-8 max-w-lg mx-auto">
                        Let ClickFlash capture your special moments with professional photography in Tunisia's most beautiful locations.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/contact"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-cyan-500 text-white font-medium rounded-full hover:bg-cyan-600 transition-all"
                        >
                            Book a Session
                        </Link>
                        <Link
                            href="/portfolio"
                            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 text-white font-medium rounded-full hover:bg-white/20 transition-all"
                        >
                            View Portfolio
                        </Link>
                    </div>
                </div>
            </section>
        </article>
    );
}
