// Firebase Functions wrapper for NestJS backend
import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import * as functions from 'firebase-functions';

let server: any;

export const api = functions.https.onRequest(async (req, res) => {
  if (!server) {
    const app = await NestFactory.create(AppModule);
    app.enableCors();
    server = app.getHttpAdapter().getInstance();
  }
  server(req, res);
});
