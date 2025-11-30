<script setup lang="ts">
import { animate, createTimeline } from 'animejs'

defineProps<{
  formattedTime: string
  state: 'idle' | 'running' | 'paused'
}>()

const emit = defineEmits<{
  skip: []
  reset: []
}>()

const colorMode = useColorMode()
const overlayRef = ref<HTMLElement | null>(null)
const gradientRef = ref<SVGElement | null>(null)
const circleRef = ref<SVGElement | null>(null)

// Wave animation timeline
let waveTimeline: ReturnType<typeof createTimeline> | null = null
let circleTimeline: ReturnType<typeof createTimeline> | null = null

// Start wave animations on mount
onMounted(() => {
  if (import.meta.server) return

  nextTick(() => {
    startWaveAnimation()
    startCircleAnimation()
  })
})

onUnmounted(() => {
  if (waveTimeline) {
    waveTimeline.pause()
    waveTimeline = null
  }
  if (circleTimeline) {
    circleTimeline.pause()
    circleTimeline = null
  }
})

function startWaveAnimation() {
  if (!gradientRef.value) return

  const stops = gradientRef.value.querySelectorAll('.wave-stop')
  if (stops.length === 0) return

  // Create a smooth, calming wave animation
  waveTimeline = createTimeline({
    loop: true,
    defaults: {
      duration: 8000,
      ease: 'inOutSine'
    }
  })

  // Animate the gradient stops offset for wave effect
  waveTimeline
    .add('.wave-stop-1', {
      offset: ['0%', '10%', '0%']
    }, 0)
    .add('.wave-stop-2', {
      offset: ['30%', '50%', '30%']
    }, 0)
    .add('.wave-stop-3', {
      offset: ['60%', '75%', '60%']
    }, 0)
    .add('.wave-stop-4', {
      offset: ['100%', '90%', '100%']
    }, 0)

  // Also animate opacity for breathing effect
  animate('.wave-layer', {
    opacity: [0.3, 0.6, 0.3],
    duration: 6000,
    ease: 'inOutSine',
    loop: true
  })
}

function startCircleAnimation() {
  if (!circleRef.value) return

  // Animate the glowing circle gradient - neon green to deep green
  circleTimeline = createTimeline({
    loop: true,
    defaults: {
      duration: 4000,
      ease: 'inOutSine'
    }
  })

  // Animate stroke opacity for pulsing glow effect
  animate('.glow-circle', {
    opacity: [0.6, 1, 0.6],
    duration: 3000,
    ease: 'inOutSine',
    loop: true
  })

  // Animate the gradient rotation effect via stop positions
  circleTimeline
    .add('.circle-stop-1', {
      stopColor: ['rgb(0, 220, 130)', 'rgb(0, 161, 85)', 'rgb(0, 220, 130)']
    }, 0)
    .add('.circle-stop-2', {
      stopColor: ['rgb(0, 161, 85)', 'rgb(5, 46, 22)', 'rgb(0, 161, 85)']
    }, 0)
    .add('.circle-stop-3', {
      stopColor: ['rgb(5, 46, 22)', 'rgb(0, 220, 130)', 'rgb(5, 46, 22)']
    }, 0)
}
</script>

<template>
  <div
    ref="overlayRef"
    class="fixed inset-0 z-[70] flex items-center justify-center overflow-hidden"
  >
    <!-- Animated gradient background -->
    <svg
      ref="gradientRef"
      class="absolute inset-0 w-full h-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <!-- Dark mode gradient -->
        <linearGradient
          id="wave-gradient-dark"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop
            class="wave-stop wave-stop-1"
            offset="0%"
            stop-color="rgb(15, 23, 42)"
          />
          <stop
            class="wave-stop wave-stop-2"
            offset="30%"
            stop-color="rgb(5, 46, 22)"
          />
          <stop
            class="wave-stop wave-stop-3"
            offset="60%"
            stop-color="rgb(15, 23, 42)"
          />
          <stop
            class="wave-stop wave-stop-4"
            offset="100%"
            stop-color="rgb(10, 83, 49)"
          />
        </linearGradient>

        <!-- Light mode gradient -->
        <linearGradient
          id="wave-gradient-light"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="100%"
        >
          <stop
            class="wave-stop wave-stop-1"
            offset="0%"
            stop-color="rgb(255, 255, 255)"
          />
          <stop
            class="wave-stop wave-stop-2"
            offset="30%"
            stop-color="rgb(217, 251, 232)"
          />
          <stop
            class="wave-stop wave-stop-3"
            offset="60%"
            stop-color="rgb(255, 255, 255)"
          />
          <stop
            class="wave-stop wave-stop-4"
            offset="100%"
            stop-color="rgb(179, 245, 209)"
          />
        </linearGradient>

        <!-- Radial gradient for wave layers -->
        <radialGradient
          id="wave-radial-dark"
          cx="50%"
          cy="50%"
          r="70%"
        >
          <stop
            offset="0%"
            stop-color="rgb(5, 46, 22)"
            stop-opacity="0.4"
          />
          <stop
            offset="100%"
            stop-color="rgb(15, 23, 42)"
            stop-opacity="0"
          />
        </radialGradient>

        <radialGradient
          id="wave-radial-light"
          cx="50%"
          cy="50%"
          r="70%"
        >
          <stop
            offset="0%"
            stop-color="rgb(179, 245, 209)"
            stop-opacity="0.5"
          />
          <stop
            offset="100%"
            stop-color="rgb(255, 255, 255)"
            stop-opacity="0"
          />
        </radialGradient>
      </defs>

      <!-- Base gradient layer -->
      <rect
        width="100%"
        height="100%"
        :fill="colorMode.value === 'dark' ? 'url(#wave-gradient-dark)' : 'url(#wave-gradient-light)'"
      />

      <!-- Animated wave layers -->
      <ellipse
        class="wave-layer wave-layer-1"
        cx="30%"
        cy="70%"
        rx="60%"
        ry="40%"
        :fill="colorMode.value === 'dark' ? 'url(#wave-radial-dark)' : 'url(#wave-radial-light)'"
        opacity="0.4"
      />
      <ellipse
        class="wave-layer wave-layer-2"
        cx="70%"
        cy="30%"
        rx="50%"
        ry="35%"
        :fill="colorMode.value === 'dark' ? 'url(#wave-radial-dark)' : 'url(#wave-radial-light)'"
        opacity="0.3"
      />
      <ellipse
        class="wave-layer wave-layer-3"
        cx="50%"
        cy="50%"
        rx="40%"
        ry="30%"
        :fill="colorMode.value === 'dark' ? 'url(#wave-radial-dark)' : 'url(#wave-radial-light)'"
        opacity="0.5"
      />
    </svg>

    <!-- Strong blur overlay -->
    <div class="absolute inset-0 backdrop-blur-2xl" />

    <!-- Centered timer content -->
    <div class="relative z-10 flex flex-col items-center justify-center p-6">
      <!-- Glowing circle around timer -->
      <div class="relative mb-8">
        <svg
          ref="circleRef"
          class="transform -rotate-90"
          width="372"
          height="372"
          viewBox="0 0 372 372"
        >
          <defs>
            <!-- Animated gradient for glowing circle -->
            <linearGradient
              id="glow-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop
                class="circle-stop-1"
                offset="0%"
                stop-color="rgb(0, 220, 130)"
              />
              <stop
                class="circle-stop-2"
                offset="50%"
                stop-color="rgb(0, 161, 85)"
              />
              <stop
                class="circle-stop-3"
                offset="100%"
                stop-color="rgb(5, 46, 22)"
              />
            </linearGradient>

            <!-- Glow filter -->
            <filter
              id="glow-filter"
              x="-50%"
              y="-50%"
              width="200%"
              height="200%"
            >
              <feGaussianBlur
                stdDeviation="4"
                result="coloredBlur"
              />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <!-- Background circle -->
          <circle
            cx="186"
            cy="186"
            r="160"
            fill="none"
            stroke="currentColor"
            stroke-width="4"
            class="text-border opacity-10"
          />

          <!-- Glowing gradient circle -->
          <circle
            class="glow-circle"
            cx="186"
            cy="186"
            r="160"
            fill="none"
            stroke="url(#glow-gradient)"
            stroke-width="14"
            stroke-linecap="round"
            filter="url(#glow-filter)"
            opacity="0.8"
          />
        </svg>

        <!-- Time display in center -->
        <div class="absolute inset-0 flex flex-col items-center justify-center">
          <div
            class="text-4xl md:text-5xl font-bold mb-2 transition-colors"
            :class="colorMode.value === 'dark' ? 'text-white' : 'text-slate-900'"
          >
            {{ formattedTime }}
          </div>

          <!-- REST label - 33% larger and bold -->
          <div
            class="text-2xl md:text-3xl font-bold tracking-wider transition-colors"
            :class="colorMode.value === 'dark' ? 'text-green-400' : 'text-green-600'"
          >
            REST
          </div>
        </div>
      </div>

      <!-- Controls - Only Skip and Reset (no Pause) -->
      <div class="flex gap-3">
        <UButton
          label="Skip"
          icon="i-lucide-skip-forward"
          color="neutral"
          variant="outline"
          size="lg"
          @click="emit('skip')"
        />
        <UButton
          label="Reset"
          icon="i-lucide-rotate-ccw"
          color="neutral"
          variant="outline"
          size="lg"
          @click="emit('reset')"
        />
      </div>
    </div>
  </div>
</template>
