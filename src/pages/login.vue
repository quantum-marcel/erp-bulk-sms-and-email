<route lang="yaml">
meta:
  layout: auth
  requiresAuth: false
</route>

<template>
  <v-container fluid class="fill-height pa-0" style="background:#F9F5F5">
    <v-row no-gutters class="fill-height">

      <!-- ── Left brand panel ──────────────────────────────────── -->
      <v-col
        cols="12" md="5"
        class="login-left-panel d-none d-md-flex flex-column justify-space-between pa-10"
      >
        <!-- Brand logo -->
        <div class="d-flex align-center ga-3">
          <div class="login-brand-icon">
            <v-img src="/newgas-logo.webp" width="40" height="30" alt="Newgas Logo"/>
          </div>
          <div>
            <p style="color:#FFDC00; font-size:12px; letter-spacing:2.5px; font-weight:700">
              BULK SMS
            </p>
          </div>
        </div>

        <!-- Hero -->
        <div>
          <div class="gold-bar mb-5" />
          <h1 class="login-hero-title mb-4">
            Reach every<br />
            customer<br />
            <span class="login-hero-accent">instantly.</span>
          </h1>
          <p class="login-hero-sub">
            Send bulk SMS to active customers, zones or custom groups — all from one place.
          </p>

          <!-- Feature pills -->
          <div class="d-flex flex-wrap ga-2 mt-7">
            <div v-for="f in features" :key="f" class="feature-pill">
              <v-icon size="12" color="#FFDC00" class="mr-1">mdi-check-circle</v-icon>
              {{ f }}
            </div>
          </div>
        </div>

        <!-- Footer -->
        <p style="color:rgba(255,255,255,0.2); font-size:11.5px">
          © {{ new Date().getFullYear() }} Newgas Ltd. All rights reserved.
        </p>
      </v-col>

      <!-- ── Right login form ──────────────────────────────────── -->
      <v-col
        cols="12" md="7"
        class="d-flex align-center justify-center"
        style="background:#FFFFFF"
      >
        <div class="login-form-wrap">

          <!-- Mobile header -->
          <div class="d-flex d-md-none align-center ga-3 mb-8">
            <div class="login-brand-icon" style="width:48px;height:48px;padding:6px">
              <v-img src="/newgas-logo.webp" width="36" height="28" alt="Newgas Logo" contain />
            </div>
            <div>
              <p style="font-size:8px;letter-spacing:2px;color:#D32129;font-weight:700">BULK SMS</p>
            </div>
          </div>

          <!-- Heading -->
          <div class="mb-7">
            <p class="login-heading">Welcome Back</p>
            <p class="login-subheading">Sign in with your credentials to continue.</p>
          </div>

          <!-- Error -->
          <v-alert
            v-if="error"
            type="error"
            density="compact"
            rounded="xl"
            closable
            class="mb-5"
            variant="tonal"
            @click:close="error = ''"
          >
            {{ error }}
          </v-alert>

          <!-- Form -->
          <v-form @submit.prevent="handleLogin" ref="formRef">
            <!-- Username -->
            <div class="mb-4">
              <label class="form-label">Username</label>
              <v-text-field
                v-model="form.username"
                placeholder="e.g. aaantwi"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                prepend-inner-icon="mdi-account-outline"
                :rules="[required]"
                hide-details="auto"
                autofocus
                class="mt-1 ng-input"
              />
            </div>

            <!-- Password -->
            <div class="mb-7">
              <label class="form-label">Password</label>
              <v-text-field
                v-model="form.password"
                :type="showPass ? 'text' : 'password'"
                placeholder="********"
                variant="outlined"
                density="comfortable"
                rounded="lg"
                prepend-inner-icon="mdi-lock-outline"
                :append-inner-icon="showPass ? 'mdi-eye-outline' : 'mdi-eye-off-outline'"
                :rules="[required]"
                hide-details="auto"
                class="mt-1 ng-input"
                @click:append-inner="showPass = !showPass"
              />
            </div>

            <!-- Submit -->
            <v-btn
              type="submit"
              block
              size="large"
              rounded="xl"
              elevation="0"
              :loading="authStore.isLoading"
              class="login-submit-btn mb-4"
            >
              <span>Sign In</span>
              <v-icon end size="18">mdi-arrow-right</v-icon>
            </v-btn>
          </v-form>

          <!-- LDAP note -->
          <div class="d-flex align-center ga-2 mt-2">
            <v-icon size="13" color="#D32129">mdi-shield-lock-outline</v-icon>
            <p style="font-size:11.5px; color:rgba(0,0,0,0.35)">
              Secured via LDAP directory
            </p>
          </div>

        </div>
      </v-col>
    </v-row>
  </v-container>
</template>

<script lang="ts" setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const router = useRouter()

const formRef  = ref()
const showPass = ref(false)
const error    = ref('')
const form     = reactive({ username: '', password: '' })

const features = ['Bulk SMS', 'Mailing Lists', 'Draft & Save', 'Delivery Reports', 'Custom Groups']

const required = (v: string) => !!v || 'This field is required'

async function handleLogin() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  error.value = ''
  try {
    await authStore.login({ username: form.username, password: form.password })
    router.replace('/dashboard')
  } catch (err: any) {
    error.value = err?.message || 'Invalid credentials. Please try again.'
  }
}
</script>

<style scoped>
/* ── Left panel ────────────────────────────────────────────────── */
.login-left-panel {
  background: linear-gradient(160deg, #1C0A0A 0%, #3F0A0C 50%, #2A0708 100%);
  position: relative;
  overflow: hidden;
}
.login-left-panel::before {
  content: '';
  position: absolute;
  width: 450px; height: 450px;
  background: rgba(211,33,41,0.14);
  border-radius: 50%;
  top: -80px; right: -120px;
  pointer-events: none;
}
.login-left-panel::after {
  content: '';
  position: absolute;
  width: 280px; height: 280px;
  background: rgba(255,220,0,0.07);
  border-radius: 50%;
  bottom: 60px; left: -60px;
  pointer-events: none;
}

/* ── Brand icon ────────────────────────────────────────────────── */
.login-brand-icon {
  width: 60px; height: 60px;
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid rgba(255,220,0,0.3);
  flex-shrink: 0;
}

/* ── Gold accent bar ───────────────────────────────────────────── */
.gold-bar {
  width: 40px; height: 4px;
  background: #FFDC00;
  border-radius: 4px;
}

/* ── Hero text ─────────────────────────────────────────────────── */
.login-hero-title {
  font-size: 38px;
  font-weight: 800;
  color: #FFFFFF;
  line-height: 1.25;
  letter-spacing: -0.5px;
}
.login-hero-accent {
  color: #FFDC00;
}
.login-hero-sub {
  color: rgba(255,255,255,0.5);
  font-size: 14.5px;
  line-height: 1.75;
  max-width: 320px;
}

/* ── Feature pills ─────────────────────────────────────────────── */
.feature-pill {
  display: inline-flex;
  align-items: center;
  font-size: 11.5px;
  color: rgba(255,255,255,0.65);
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 3px 10px;
}

/* ── Right form ────────────────────────────────────────────────── */
.login-form-wrap {
  width: 100%;
  max-width: 420px;
  padding: 32px 24px;
}

.login-heading {
  font-size: 26px;
  font-weight: 800;
  color: #1C0A0A;
  letter-spacing: -0.3px;
  line-height: 1.2;
  margin-bottom: 6px;
}
.login-subheading {
  font-size: 13.5px;
  color: rgba(0,0,0,0.45);
  line-height: 1.6;
}

.form-label {
  font-size: 12.5px;
  font-weight: 600;
  color: #1C0A0A;
  letter-spacing: 0.2px;
}

/* Input focus ring using Newgas red */
.ng-input :deep(.v-field--focused .v-field__outline) {
  color: #D32129 !important;
  --v-field-border-opacity: 1;
}

/* ── Submit button ─────────────────────────────────────────────── */
.login-submit-btn {
  background: #D32129 !important;
  color: #FFFFFF !important;
  font-size: 15px !important;
  font-weight: 700 !important;
  height: 52px !important;
  text-transform: none;
  letter-spacing: 0.2px;
}
.login-submit-btn:hover {
  background: #A91A21 !important;
}
</style>
