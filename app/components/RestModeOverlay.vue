<script setup lang="ts">
import { animate, createTimeline } from 'animejs'
import type { PrimaryColor } from '~/composables/useThemeSettings'

defineProps<{
  formattedTime: string
  state: 'idle' | 'running' | 'paused'
}>()

const emit = defineEmits<{
  skip: []
  reset: []
}>()

const colorMode = useColorMode()
const { primaryColor } = useThemeSettings()
const overlayRef = ref<HTMLElement | null>(null)
const gradientRef = ref<SVGElement | null>(null)
const circleRef = ref<SVGElement | null>(null)

// Color palettes for each primary color (dark shades for backgrounds, bright for accents)
const colorPalettes: Record<PrimaryColor, { dark: string[]; light: string[]; accent: string[] }> = {
  red: {
    dark: ['rgb(127, 29, 29)', 'rgb(69, 10, 10)', 'rgb(153, 27, 27)'],
    light: ['rgb(254, 226, 226)', 'rgb(254, 202, 202)', 'rgb(252, 165, 165)'],
    accent: ['rgb(248, 113, 113)', 'rgb(239, 68, 68)', 'rgb(127, 29, 29)']
  },
  orange: {
    dark: ['rgb(124, 45, 18)', 'rgb(67, 20, 7)', 'rgb(154, 52, 18)'],
    light: ['rgb(255, 237, 213)', 'rgb(254, 215, 170)', 'rgb(253, 186, 116)'],
    accent: ['rgb(251, 146, 60)', 'rgb(249, 115, 22)', 'rgb(124, 45, 18)']
  },
  amber: {
    dark: ['rgb(120, 53, 15)', 'rgb(69, 26, 3)', 'rgb(146, 64, 14)'],
    light: ['rgb(254, 243, 199)', 'rgb(253, 230, 138)', 'rgb(252, 211, 77)'],
    accent: ['rgb(251, 191, 36)', 'rgb(245, 158, 11)', 'rgb(120, 53, 15)']
  },
  yellow: {
    dark: ['rgb(113, 63, 18)', 'rgb(66, 32, 6)', 'rgb(133, 77, 14)'],
    light: ['rgb(254, 249, 195)', 'rgb(254, 240, 138)', 'rgb(253, 224, 71)'],
    accent: ['rgb(250, 204, 21)', 'rgb(234, 179, 8)', 'rgb(113, 63, 18)']
  },
  lime: {
    dark: ['rgb(54, 83, 20)', 'rgb(26, 46, 5)', 'rgb(63, 98, 18)'],
    light: ['rgb(236, 252, 203)', 'rgb(217, 249, 157)', 'rgb(190, 242, 100)'],
    accent: ['rgb(163, 230, 53)', 'rgb(132, 204, 22)', 'rgb(54, 83, 20)']
  },
  green: {
    dark: ['rgb(10, 83, 49)', 'rgb(5, 46, 22)', 'rgb(22, 101, 52)'],
    light: ['rgb(217, 251, 232)', 'rgb(187, 247, 208)', 'rgb(134, 239, 172)'],
    accent: ['rgb(0, 220, 130)', 'rgb(0, 161, 85)', 'rgb(5, 46, 22)']
  },
  emerald: {
    dark: ['rgb(6, 78, 59)', 'rgb(2, 44, 34)', 'rgb(4, 120, 87)'],
    light: ['rgb(209, 250, 229)', 'rgb(167, 243, 208)', 'rgb(110, 231, 183)'],
    accent: ['rgb(52, 211, 153)', 'rgb(16, 185, 129)', 'rgb(6, 78, 59)']
  },
  teal: {
    dark: ['rgb(17, 94, 89)', 'rgb(4, 47, 46)', 'rgb(15, 118, 110)'],
    light: ['rgb(204, 251, 241)', 'rgb(153, 246, 228)', 'rgb(94, 234, 212)'],
    accent: ['rgb(45, 212, 191)', 'rgb(20, 184, 166)', 'rgb(17, 94, 89)']
  },
  cyan: {
    dark: ['rgb(22, 78, 99)', 'rgb(8, 51, 68)', 'rgb(14, 116, 144)'],
    light: ['rgb(207, 250, 254)', 'rgb(165, 243, 252)', 'rgb(103, 232, 249)'],
    accent: ['rgb(34, 211, 238)', 'rgb(6, 182, 212)', 'rgb(22, 78, 99)']
  },
  sky: {
    dark: ['rgb(12, 74, 110)', 'rgb(8, 47, 73)', 'rgb(3, 105, 161)'],
    light: ['rgb(224, 242, 254)', 'rgb(186, 230, 253)', 'rgb(125, 211, 252)'],
    accent: ['rgb(56, 189, 248)', 'rgb(14, 165, 233)', 'rgb(12, 74, 110)']
  },
  blue: {
    dark: ['rgb(30, 64, 175)', 'rgb(23, 37, 84)', 'rgb(29, 78, 216)'],
    light: ['rgb(219, 234, 254)', 'rgb(191, 219, 254)', 'rgb(147, 197, 253)'],
    accent: ['rgb(96, 165, 250)', 'rgb(59, 130, 246)', 'rgb(30, 64, 175)']
  },
  indigo: {
    dark: ['rgb(55, 48, 163)', 'rgb(30, 27, 75)', 'rgb(67, 56, 202)'],
    light: ['rgb(224, 231, 255)', 'rgb(199, 210, 254)', 'rgb(165, 180, 252)'],
    accent: ['rgb(129, 140, 248)', 'rgb(99, 102, 241)', 'rgb(55, 48, 163)']
  },
  violet: {
    dark: ['rgb(76, 29, 149)', 'rgb(46, 16, 101)', 'rgb(91, 33, 182)'],
    light: ['rgb(237, 233, 254)', 'rgb(221, 214, 254)', 'rgb(196, 181, 253)'],
    accent: ['rgb(167, 139, 250)', 'rgb(139, 92, 246)', 'rgb(76, 29, 149)']
  },
  purple: {
    dark: ['rgb(88, 28, 135)', 'rgb(59, 7, 100)', 'rgb(107, 33, 168)'],
    light: ['rgb(243, 232, 255)', 'rgb(233, 213, 255)', 'rgb(216, 180, 254)'],
    accent: ['rgb(192, 132, 252)', 'rgb(168, 85, 247)', 'rgb(88, 28, 135)']
  },
  fuchsia: {
    dark: ['rgb(112, 26, 117)', 'rgb(74, 4, 78)', 'rgb(134, 25, 143)'],
    light: ['rgb(250, 232, 255)', 'rgb(245, 208, 254)', 'rgb(240, 171, 252)'],
    accent: ['rgb(232, 121, 249)', 'rgb(217, 70, 239)', 'rgb(112, 26, 117)']
  },
  pink: {
    dark: ['rgb(131, 24, 67)', 'rgb(80, 7, 36)', 'rgb(157, 23, 77)'],
    light: ['rgb(252, 231, 243)', 'rgb(251, 207, 232)', 'rgb(249, 168, 212)'],
    accent: ['rgb(244, 114, 182)', 'rgb(236, 72, 153)', 'rgb(131, 24, 67)']
  },
  rose: {
    dark: ['rgb(136, 19, 55)', 'rgb(76, 5, 25)', 'rgb(159, 18, 57)'],
    light: ['rgb(255, 228, 230)', 'rgb(254, 205, 211)', 'rgb(253, 164, 175)'],
    accent: ['rgb(251, 113, 133)', 'rgb(244, 63, 94)', 'rgb(136, 19, 55)']
  }
}

// Get current color palette based on primary color
const currentPalette = computed(() => colorPalettes[primaryColor.value])

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

// Watch for primary color changes and restart animations
watch(primaryColor, () => {
  // Restart circle animation with new colors
  if (circleTimeline) {
    circleTimeline.pause()
    circleTimeline = null
  }
  nextTick(() => {
    startCircleAnimation()
  })
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

  const palette = currentPalette.value

  // Animate the glowing circle gradient
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
      stopColor: [palette.accent[0], palette.accent[1], palette.accent[0]]
    }, 0)
    .add('.circle-stop-2', {
      stopColor: [palette.accent[1], palette.accent[2], palette.accent[1]]
    }, 0)
    .add('.circle-stop-3', {
      stopColor: [palette.accent[2], palette.accent[0], palette.accent[2]]
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
            :stop-color="currentPalette.dark[1]"
          />
          <stop
            class="wave-stop wave-stop-3"
            offset="60%"
            stop-color="rgb(15, 23, 42)"
          />
          <stop
            class="wave-stop wave-stop-4"
            offset="100%"
            :stop-color="currentPalette.dark[0]"
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
            :stop-color="currentPalette.light[0]"
          />
          <stop
            class="wave-stop wave-stop-3"
            offset="60%"
            stop-color="rgb(255, 255, 255)"
          />
          <stop
            class="wave-stop wave-stop-4"
            offset="100%"
            :stop-color="currentPalette.light[2]"
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
            :stop-color="currentPalette.dark[1]"
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
            :stop-color="currentPalette.light[2]"
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
                :stop-color="currentPalette.accent[0]"
              />
              <stop
                class="circle-stop-2"
                offset="50%"
                :stop-color="currentPalette.accent[1]"
              />
              <stop
                class="circle-stop-3"
                offset="100%"
                :stop-color="currentPalette.accent[2]"
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
          <div class="text-2xl md:text-3xl font-bold tracking-wider transition-colors text-primary">
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
