{{/*
Global helpers that work consistently across all charts
*/}}

{{/* 
Generate a consistent name for any component
Usage: {{ include "trascendence.name" (dict "Chart" .Chart "Values" .Values "Release" .Release "Component" "frontend") }}
*/}}
{{- define "common.name" -}}
{{- $ctx := . -}}
{{- $name := "" -}}
{{- if and $ctx.Values (hasKey $ctx.Values "nameOverride") -}}
{{- $name = $ctx.Values.nameOverride -}}
{{- else if $ctx.Chart -}}
{{- $name = $ctx.Chart.Name -}}
{{- else -}}
{{- $name = "trascendence" -}}
{{- end -}}
{{- if $ctx.Component -}}
{{- printf "%s-%s" $name $ctx.Component | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}

{{/* Add common.fullname helper */}}
{{- define "common.fullname" -}}
{{- $ctx := . -}}
{{- if and $ctx.Values (hasKey $ctx.Values "fullnameOverride") -}}
{{- $ctx.Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := "" -}}
{{- if and $ctx.Values (hasKey $ctx.Values "nameOverride") -}}
{{- $name = $ctx.Values.nameOverride -}}
{{- else if $ctx.Chart -}}
{{- $name = $ctx.Chart.Name -}}
{{- else -}}
{{- $name = "trascendence" -}}
{{- end -}}
{{- if $ctx.Component -}}
{{- printf "%s-%s-%s" $ctx.Release.Name $name $ctx.Component | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" $ctx.Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/* Add common.namespace helper */}}
{{- define "common.namespace" -}}
{{- $ctx := . -}}
{{- if and $ctx.Values (hasKey $ctx.Values "global") (hasKey $ctx.Values.global "namespaceOverride") -}}
{{- $ctx.Values.global.namespaceOverride -}}
{{- else if and $ctx.Values (hasKey $ctx.Values "namespace") -}}
{{- $ctx.Values.namespace -}}
{{- else if eq $ctx.Component "frontend" -}}
{{- "front-end" -}}
{{- else if eq $ctx.Component "chat" -}}
{{- "chat" -}}
{{- else if eq $ctx.Component "login" -}}
{{- "login" -}}
{{- else if eq $ctx.Component "pong" -}}
{{- "pong" -}}
{{- else if eq $ctx.Component "redis" -}}
{{- "redis-namespace" -}}
{{- else if eq $ctx.Component "minio" -}}
{{- "minio" -}}
{{- else -}}
{{- $ctx.Values.namespace -}}
{{- end -}}
{{- end -}}

{{/* Add common.labels helper */}}
{{- define "common.labels" -}}
{{- $ctx := . -}}
app.kubernetes.io/name: {{ include "common.name" $ctx }}
helm.sh/chart: {{ printf "%s-%s" $ctx.Chart.Name $ctx.Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
app.kubernetes.io/instance: {{ $ctx.Release.Name }}
app.kubernetes.io/managed-by: {{ $ctx.Release.Service }}
{{- if $ctx.Chart.AppVersion }}
app.kubernetes.io/version: {{ $ctx.Chart.AppVersion | quote }}
{{- end }}
{{- if $ctx.Component }}
app.kubernetes.io/component: {{ $ctx.Component }}
{{- end }}
{{- end -}}

{{/* Add common.selectorLabels helper */}}
{{- define "common.selectorLabels" -}}
{{- $ctx := . -}}
app.kubernetes.io/name: {{ $ctx.Component | default "app" }}
app.kubernetes.io/instance: {{ $ctx.Release.Name }}
{{- end -}}

{{/* Add common.serviceAccountName helper */}}
{{- define "common.serviceAccountName" -}}
{{- $ctx := . -}}
{{- if and $ctx.Values (hasKey $ctx.Values "serviceAccount") $ctx.Values.serviceAccount.create -}}
{{- if $ctx.Values.serviceAccount.name -}}
{{- $ctx.Values.serviceAccount.name -}}
{{- else -}}
{{- printf "%s-%s" $ctx.Release.Name $ctx.Component -}}
{{- end -}}
{{- else -}}
{{- "default" -}}
{{- end -}}
{{- end -}}

{{/* Keep the original trascendence.* functions for backward compatibility */}}
{{- define "trascendence.name" -}}
{{- include "common.name" . -}}
{{- end -}}

{{- define "trascendence.fullname" -}}
{{- include "common.fullname" . -}}
{{- end -}}

{{- define "trascendence.namespace" -}}
{{- include "common.namespace" . -}}
{{- end -}}

{{- define "trascendence.labels" -}}
{{- include "common.labels" . -}}
{{- end -}}

{{- define "trascendence.selectorLabels" -}}
{{- include "common.selectorLabels" . -}}
{{- end -}}

{{- define "trascendence.serviceAccountName" -}}
{{- include "common.serviceAccountName" . -}}
{{- end -}}

{{/* Keep any additional trascendence.* helpers */}}
{{- define "trascendence.middlewareRefs" -}}
{{- $ctx := . -}}
{{- $refs := list -}}
{{- range $ctx.Types -}}
{{- $refs = append $refs (printf "%s-%s-%s@kubernetescrd" $ctx.Values.namespace $ctx.Release.Name .) -}}
{{- end -}}
{{- join "," $refs -}}
{{- end -}}

{{- define "trascendence.isEnabled" -}}
{{- if hasKey .Values .Feature -}}
{{- if hasKey (index .Values .Feature) "enabled" -}}
{{- index .Values .Feature "enabled" -}}
{{- else -}}
true
{{- end -}}
{{- else -}}
false
{{- end -}}
{{- end -}}

{{/* Debug helper to print information */}}
{{- define "common.debugInfo" -}}
{{- $ctx := . -}}
Chart: {{ if $ctx.Chart }}{{ $ctx.Chart.Name }}{{ else }}nil{{ end }},
Release: {{ if $ctx.Release }}{{ $ctx.Release.Name }}{{ else }}nil{{ end }},
Component: {{ if $ctx.Component }}{{ $ctx.Component }}{{ else }}nil{{ end }}
{{- end -}}