<template>
  <div class="tiptap-editor compose-area">
    <!-- Toolbar -->
    <div class="editor-toolbar pa-2 d-flex align-center flex-wrap ga-1">
      <v-btn-toggle density="compact" variant="text" divided rounded="lg">
        <v-btn
          icon size="small"
          :class="{ 'active-tool': editor?.isActive('bold') }"
          @click="editor?.chain().focus().toggleBold().run()"
        >
          <v-icon size="16">mdi-format-bold</v-icon>
        </v-btn>
        <v-btn
          icon size="small"
          :class="{ 'active-tool': editor?.isActive('italic') }"
          @click="editor?.chain().focus().toggleItalic().run()"
        >
          <v-icon size="16">mdi-format-italic</v-icon>
        </v-btn>
        <v-btn
          icon size="small"
          :class="{ 'active-tool': editor?.isActive('underline') }"
          @click="editor?.chain().focus().toggleUnderline().run()"
        >
          <v-icon size="16">mdi-format-underline</v-icon>
        </v-btn>
      </v-btn-toggle>

      <v-divider vertical class="mx-1" style="height:24px" />

      <v-btn-toggle density="compact" variant="text" divided rounded="lg">
        <v-btn icon size="small" @click="editor?.chain().focus().setTextAlign('left').run()">
          <v-icon size="16">mdi-format-align-left</v-icon>
        </v-btn>
        <v-btn icon size="small" @click="editor?.chain().focus().setTextAlign('center').run()">
          <v-icon size="16">mdi-format-align-center</v-icon>
        </v-btn>
        <v-btn icon size="small" @click="editor?.chain().focus().setTextAlign('right').run()">
          <v-icon size="16">mdi-format-align-right</v-icon>
        </v-btn>
      </v-btn-toggle>

      <v-divider vertical class="mx-1" style="height:24px" />

      <v-btn-toggle density="compact" variant="text" divided rounded="lg">
        <v-btn
          icon size="small"
          :class="{ 'active-tool': editor?.isActive('bulletList') }"
          @click="editor?.chain().focus().toggleBulletList().run()"
        >
          <v-icon size="16">mdi-format-list-bulleted</v-icon>
        </v-btn>
        <v-btn
          icon size="small"
          :class="{ 'active-tool': editor?.isActive('orderedList') }"
          @click="editor?.chain().focus().toggleOrderedList().run()"
        >
          <v-icon size="16">mdi-format-list-numbered</v-icon>
        </v-btn>
      </v-btn-toggle>

      <v-spacer />

      <!-- SMS character counter — only shown when requested -->
      <div
        v-if="showCounter"
        class="char-counter"
        :class="{ 'counter-warn': charCount > 160, 'counter-over': charCount > 320 }"
      >
        <span class="font-weight-bold">{{ charCount }}</span>
        <span class="text-caption"> / {{ smsCount }} SMS</span>
      </div>
    </div>

    <v-divider />

    <!-- Editor content -->
    <editor-content :editor="editor" />
  </div>
</template>

<script lang="ts" setup>
import { computed, onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'

const props = defineProps<{
  modelValue: string
  placeholder?: string
  showCounter?: boolean
}>()

const emit = defineEmits<{ 'update:modelValue': [string] }>()

const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit,
    Underline,
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Placeholder.configure({ placeholder: props.placeholder ?? 'Write your message here...' }),
    CharacterCount,
  ],
  onUpdate({ editor }) {
    emit('update:modelValue', editor.getHTML())
  },
  editorProps: {
    attributes: {
      class: 'tiptap-content',
    },
  },
})

watch(
  () => props.modelValue,
  (val) => {
    if (editor.value && editor.value.getHTML() !== val) {
      editor.value.commands.setContent(val, false)
    }
  }
)

const charCount = computed(() => editor.value?.storage.characterCount.characters() ?? 0)
const smsCount  = computed(() => Math.ceil(charCount.value / 160) || 1)

onBeforeUnmount(() => editor.value?.destroy())
</script>

<style scoped>
.editor-toolbar {
  background: rgba(var(--v-theme-surface), 1);
  border-bottom: 1px solid rgba(0,0,0,0.08);
  min-height: 48px;
}
.active-tool {
  background: rgba(211,33,41,0.1) !important;
  color: #D32129 !important;
}
.char-counter {
  font-size: 12px;
  color: #2E7D32;
  background: rgba(var(--v-theme-success), 0.1);
  padding: 3px 10px;
  border-radius: 20px;
  font-weight: 500;
}
.counter-warn {
  color: #998400;
  background: rgba(var(--v-theme-warning), 0.1);
}
.counter-over {
  color: #D32129;
  background: rgba(var(--v-theme-error), 0.1);
}
</style>

<style>
.tiptap-content {
  outline: none;
  padding: 16px;
  min-height: 200px;
  font-size: 15px;
  line-height: 1.7;
  font-family: 'DM Sans', sans-serif;
}
.tiptap-content p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: #adb5bd;
  pointer-events: none;
  float: left;
  height: 0;
}
.tiptap-content ul, .tiptap-content ol {
  padding-left: 24px;
}
</style>