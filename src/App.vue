<script setup lang="ts">
import './index.css';
import MphAnalyzer from './components/MphAnalyzer.vue';

console.log('--inject--', window.__FLAG1__, window.__FLAG2__);
</script>

<template>
  <MphAnalyzer />
</template>

<style>
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
