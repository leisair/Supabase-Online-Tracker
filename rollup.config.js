import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default [
  // ES Module 版本
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: true
    },
    plugins: [
      resolve(),
      commonjs()
    ],
    external: ['@supabase/supabase-js']
  },
  // CommonJS 版本
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named'
    },
    plugins: [
      resolve(),
      commonjs()
    ],
    external: ['@supabase/supabase-js']
  },
  // UMD 版本（浏览器直接使用）
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.umd.js',
      format: 'umd',
      name: 'SupabaseOnlineTracker',
      sourcemap: true,
      globals: {
        '@supabase/supabase-js': 'supabase'
      }
    },
    plugins: [
      resolve(),
      commonjs()
    ],
    external: ['@supabase/supabase-js']
  },
  // UMD 压缩版本
  {
    input: 'src/index.js',
    output: {
      file: 'dist/index.umd.min.js',
      format: 'umd',
      name: 'SupabaseOnlineTracker',
      sourcemap: true,
      globals: {
        '@supabase/supabase-js': 'supabase'
      }
    },
    plugins: [
      resolve(),
      commonjs(),
      terser()
    ],
    external: ['@supabase/supabase-js']
  }
];
