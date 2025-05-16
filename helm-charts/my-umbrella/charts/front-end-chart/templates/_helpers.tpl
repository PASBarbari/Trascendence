{{/* vim: set filetype=mustache: */}}
{{/*
Expand the name of the chart.
*/}}
{{- define "front-end-chart.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "front-end-chart.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "front-end-chart.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "front-end-chart.labels" -}}
helm.sh/chart: {{ include "front-end-chart.chart" . }}
{{ include "front-end-chart.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "front-end-chart.selectorLabels" -}}
app.kubernetes.io/name: {{ include "front-end-chart.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Also define the original template name used in your file for backwards compatibility
*/}}
{{- define "frontend.labels" -}}
{{ include "front-end-chart.labels" . }}
{{- end }}
{{/*
Create the name of the service account to use
*/}}
{{- define "front-end-chart.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "front-end-chart.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Create the name of the ingress to use
*/}}
{{- define "front-end-chart.ingressName" -}}
{{- if .Values.ingress.nameOverride }}
{{- .Values.ingress.nameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- include "front-end-chart.fullname" . }}
{{- end }}
{{- end }}

{{/*
Create the name of the configmap to use
*/}}
{{- define "front-end-chart.configMapName" -}}
{{- if .Values.configMap.nameOverride }}
{{- .Values.configMap.nameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- include "front-end-chart.fullname" . }}
{{- end }}
{{- end }}
