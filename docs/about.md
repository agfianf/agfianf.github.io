---
title: About
description: Agfian is an AI engineer in Indonesia who takes computer vision models from the notebook to production, with the MLOps and backend around them.
hide:
  - navigation
  - toc
---

# About

I'm **Muhammad Agfian Fadilah**, an AI engineer based in Indonesia. I take computer vision models from the notebook to production: curating the data, training and evaluating, optimising for the hardware they run on, serving them behind APIs, and watching them once they're live.

Around that core I build the MLOps that keeps it repeatable (experiment tracking, reusable training templates, fast deploys, monitoring and alerts), the FastAPI services that put models in front of users, and, more recently, LLM-powered automations. This blog is where I write down what I learn along the way.

[:hugeicons-mail-01: Email me](mailto:agfianfd@gmail.com){ .md-button .md-button--primary }
[:hugeicons-linkedin-01: LinkedIn](https://www.linkedin.com/in/magfianf/){ .md-button }
[:hugeicons-github-01: GitHub](https://github.com/agfianf){ .md-button }

## What I work with

| Area | Tools |
|:--|:--|
| **Computer vision** | `PyTorch`, `PyTorch Lightning`, `Ultralytics`, `OpenCV`, `PaddleOCR`, `ONNX`, `TensorRT`, `Triton Inference Server` |
| **MLOps and data** | `ClearML`, `CVAT`, `FiftyOne`, `MinIO`, `Streamlit` |
| **Backend** | `Python`, `FastAPI`, `Pydantic`, `SQLAlchemy`, `PostgreSQL`, `Redis`, `RabbitMQ`, `Celery`, `PyTest` |
| **DevOps and cloud** | `Docker`, `Kubernetes`, `GitHub Actions`, `GitLab CI`, `Terraform`, `Ansible`, `Prometheus`, `Grafana`, `AWS`, `GCP`, `Azure` |
| **Geospatial** | `PostGIS`, `GeoPandas`, `Shapely`, `Sentinel-2` |
| **Edge hardware** | `NVIDIA Jetson`, `Raspberry Pi` |

## Things I've built in the open

- [**Template Ultralytics ClearML**](https://github.com/agfianf/template-yolov8-clearml): a reproducible template for training Ultralytics YOLO models with full ClearML integration (experiment tracking, dataset management, model registry and remote execution).
- [**Template RF-DETR ClearML**](https://github.com/agfianf/template-rf-detr-clearml): the same idea for RF-DETR detection models, with ClearML tracking and CVAT as the data source.
- [**Color Correction**](https://agfianf.github.io/color-correction/): automatic colour correction from a 24-patch colour checker card, with YOLOv8 to find the card and OpenCV to apply the correction matrix.
- [**Reverse Geocode API**](https://github.com/agfianf/reverse-geocode-api): turns latitude and longitude into an Indonesian district, regency and province, built with FastAPI, PostGIS and Redis and deployed with Terraform on AWS.
- [**PaddleOCR fix**](https://github.com/PaddlePaddle/PaddleOCR/pull/11287): a merged fix for an ambiguous boolean evaluation that broke the detection-only pipeline on Python 3.11.

## Get in touch

The fastest way to reach me is [email](mailto:agfianfd@gmail.com) or [LinkedIn](https://www.linkedin.com/in/magfianf/). I'm happy to talk about computer vision in production, MLOps, or anything I've written here.
