module.exports = {
  purge: {
    content: [
      '*.html',
      './src/*.js',
    ],
    safelist: [
      'w-1\/2'
    ]
  },
  darkMode: false, // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
}
