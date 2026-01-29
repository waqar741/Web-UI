import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import * as fflate from 'fflate';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { defineConfig, loadEnv } from 'vite';
import devtoolsJson from 'vite-plugin-devtools-json';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';

const GUIDE_FOR_FRONTEND = `
`.trim();

const MAX_BUNDLE_SIZE = 5000 * 1024;

/**
 * the maximum size of an embedded asset in bytes,
 * e.g. maximum size of embedded font (see node_modules/katex/dist/fonts/*.woff2)
 */
const MAX_ASSET_SIZE = 32000;

/** public/index.html.gz minified flag */
const ENABLE_JS_MINIFICATION = true;

function llamaCppBuildPlugin() {
    return {
        name: 'llamacpp:build',
        apply: 'build' as const,
        closeBundle() {
            // Note: This plugin expects the original folder structure (../public)
            // It will not run during 'npm run dev', so it is safe to leave for now.
            setTimeout(() => {
                try {
                    const indexPath = resolve('../public/index.html');
                    const gzipPath = resolve('../public/index.html.gz');

                    if (!existsSync(indexPath)) return;

                    let content = readFileSync(indexPath, 'utf-8');
                    const faviconPath = resolve('static/favicon.svg');
                    if (existsSync(faviconPath)) {
                        const faviconContent = readFileSync(faviconPath, 'utf-8');
                        const faviconBase64 = Buffer.from(faviconContent).toString('base64');
                        const faviconDataUrl = `data:image/svg+xml;base64,${faviconBase64}`;
                        content = content.replace(/href="[^"]*favicon\.svg"/g, `href="${faviconDataUrl}"`);
                        console.log('✓ Inlined favicon.svg as base64 data URL');
                    }

                    content = content.replace(/\r/g, '');
                    content = GUIDE_FOR_FRONTEND + '\n' + content;

                    const compressed = fflate.gzipSync(Buffer.from(content, 'utf-8'), { level: 9 });

                    // Zero out OS/time fields for deterministic builds
                    compressed[0x4] = 0; compressed[0x5] = 0; compressed[0x6] = 0; compressed[0x7] = 0; compressed[0x9] = 0;

                    if (compressed.byteLength > MAX_BUNDLE_SIZE) {
                        throw new Error(`Bundle size is too large (${Math.ceil(compressed.byteLength / 1024)} KB).`);
                    }

                    writeFileSync(gzipPath, compressed);
                    console.log('✓ Created index.html.gz');
                } catch (error) {
                    console.error('Failed to create gzip file:', error);
                }
            }, 100);
        }
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const target = env.VITE_PROXY_TARGET || 'http://localhost:8080';

    const proxyPaths = [
        '/v1',
        '/config',
        '/props',
        '/models',
        '/slots',
        '/tokenize',
        '/detokenize',
        '/embedding',
        '/completion',
        '/health',
        '/json-schema-to-grammar.mjs',
        '/lora-adapters',
        '/metrics',
        '/api'
    ];

    const proxy: Record<string, any> = {};
    for (const path of proxyPaths) {
        proxy[path] = {
            target,
            changeOrigin: true
        };
    }

    return {
        resolve: {
            alias: {
                'katex-fonts': resolve('node_modules/katex/dist/fonts')
            }
        },
        build: {
            assetsInlineLimit: MAX_ASSET_SIZE,
            chunkSizeWarningLimit: 3072,
            minify: ENABLE_JS_MINIFICATION
        },
        css: {
            preprocessorOptions: {
                scss: {
                    additionalData: `
                    $use-woff2: true;
                    $use-woff: false;
                    $use-ttf: false;
                `
                }
            }
        },
        plugins: [tailwindcss(), sveltekit(), devtoolsJson(), llamaCppBuildPlugin()],
        test: {
            projects: [
                {
                    extends: './vite.config.ts',
                    test: {
                        name: 'client',
                        environment: 'browser',
                        browser: {
                            enabled: true,
                            provider: 'playwright',
                            instances: [{ browser: 'chromium' }]
                        },
                        include: ['tests/client/**/*.svelte.{test,spec}.{js,ts}'],
                        setupFiles: ['./vitest-setup-client.ts']
                    }
                },
                {
                    extends: './vite.config.ts',
                    test: {
                        name: 'unit',
                        environment: 'node',
                        include: ['tests/unit/**/*.{test,spec}.{js,ts}']
                    }
                },
                {
                    extends: './vite.config.ts',
                    test: {
                        name: 'ui',
                        environment: 'browser',
                        browser: {
                            enabled: true,
                            provider: 'playwright',
                            instances: [{ browser: 'chromium', headless: true }]
                        },
                        include: ['tests/stories/**/*.stories.{js,ts,svelte}'],
                        setupFiles: ['./.storybook/vitest.setup.ts']
                    },
                    plugins: [
                        storybookTest({
                            storybookScript: 'pnpm run storybook --no-open'
                        })
                    ]
                }
            ]
        },

        // --- PROXY CONFIGURATION START ---
        server: {
            proxy,
            headers: {
                'Cross-Origin-Embedder-Policy': 'require-corp',
                'Cross-Origin-Opener-Policy': 'same-origin'
            }
        }
        // --- PROXY CONFIGURATION END ---
    };
});
