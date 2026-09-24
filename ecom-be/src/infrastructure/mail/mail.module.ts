// src/infrastructure/mail/mail.module.ts
import { Global, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = config.get('NODE_ENV') !== 'production';
        const mailHost = config.get<string>('MAIL_HOST', 'localhost');
        const mailPort = config.get<number>('MAIL_PORT', isDev ? 1025 : 587);
        const user = config.get<string>('MAIL_USER');
        const pass = config.get<string>('MAIL_PASSWORD');

        // Dev + Mailhog: không cần auth, không cần TLS
        const isMailhog = mailHost === 'localhost' && mailPort === 1025;

        const transport: any = {
          host: mailHost,
          port: mailPort,
          secure: config.get<string>('MAIL_SECURE') === 'true',
        };

        if (!isMailhog && user && pass) {
          transport.auth = { user, pass };
        }

        if (isMailhog) {
          transport.tls = { rejectUnauthorized: false };
          transport.ignoreTLS = true;
        }

        return {
          transport,
          defaults: {
            from: `"${config.get('MAIL_FROM_NAME', 'E-Commerce')}" <${config.get('MAIL_FROM', 'noreply@ecommerce.local')}>`,
          },
          template: {
            dir: join(__dirname, 'templates'),
            adapter: new HandlebarsAdapter(),
            options: { strict: true },
          },
        };
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule { }
