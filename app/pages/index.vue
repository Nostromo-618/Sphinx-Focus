<template>
  <div>
    <div class="container mx-auto px-4 py-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              Focus Timer
            </h3>
          </template>
          <FocusTimer />
        </UCard>

        <UCard>
          <template #header>
            <h3 class="text-lg font-semibold">
              Task List
            </h3>
          </template>
          <TaskList />
        </UCard>
      </div>
    </div>
  </div>
</template>
