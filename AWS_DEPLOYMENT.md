# Deploy FinSense on AWS

This setup uses Elastic Beanstalk's **Docker on Amazon Linux 2023** platform. One container serves the Vite interface and Next.js API on the same HTTPS hostname. FinSense stores data in PostgreSQL through Prisma.

## 1. Prepare the upload

From the `PersonalFinance-SpendingAdvisor` folder in PowerShell, run:

```powershell
.\scripts\package-aws.ps1
```

Upload the resulting `finsense-aws.zip`. Its root contains `Dockerfile`, `client/`, and `server/`. The package excludes local credentials, installed dependencies, generated builds, and the Cloudflare exports. Docker installs the locked dependencies and builds with Node.js 22.

## 2. Choose the database and prepare secrets

For an AWS-managed database, create an **Amazon RDS for PostgreSQL** database in the same region and VPC as the Beanstalk environment. Choose private access and set **Initial database name** to `finsense`. Once the environment's EC2 instance security group exists, add an inbound PostgreSQL rule on the RDS security group for port 5432 with that instance security group as its source. An existing PostgreSQL service such as Supabase also works if Beanstalk can reach its runtime and direct endpoints.

Configure the following in Elastic Beanstalk under **Configuration → Updates, monitoring, and logging → Environment properties**. For secret values, pick **Secrets Manager** as the source and give the Beanstalk EC2 instance profile permission to read the specific secrets.

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | PostgreSQL runtime URL, with TLS enabled. |
| `DIRECT_URL` | Direct or session-mode PostgreSQL URL for schema setup. For direct RDS connections, use the same value as `DATABASE_URL`. |
| `JWT_SECRET` | A fresh random value. Generate with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` and keep it private. |
| `CLIENT_ORIGIN` | Your exact public HTTPS origin, for example `https://finance.example.com`, without a trailing slash. |
| `GEMINI_API_KEY` | Supply a Gemini key to enable live AI features. |

An RDS URL uses the form `postgresql://APP_USER:ENCODED_PASSWORD@RDS_ENDPOINT:5432/finsense?sslmode=require`. Percent-encode reserved characters in the database password. Use a dedicated PostgreSQL database for FinSense. Keep the JWT secret stable across restarts and instances.

## 3. Create the Beanstalk environment

1. Open **Elastic Beanstalk → Environments → Create environment**. Select **Web server environment**, for example application `finsense` and environment `finsense-prod`.
2. Select **Managed platform → Docker → Docker running on 64bit Amazon Linux 2023**. Choose **Upload your code** and select `finsense-aws.zip`.
3. Choose a load-balanced setup with an **Application Load Balancer**. Select a Beanstalk service role and EC2 instance profile, and choose the VPC and subnets. For private RDS, ensure the app instances can reach it, and ensure the instances can reach the package and image registries needed for the Docker build.
4. Under the ALB's **Processes**, set the default process health check path to `/api/health`. Configure the environment properties above and create the environment. The check verifies that the application process responds.
5. In **AWS Certificate Manager**, issue and validate a certificate for your hostname in the same region. Add an **HTTPS 443** listener on the Beanstalk ALB with that certificate and the default process. Point your hostname to the environment with Route 53 or your DNS provider. Set the HTTP listener to redirect to HTTPS. Use the HTTPS hostname for sign-in.

## 4. Initialize a new database

Run the following once against a new FinSense database. On one Beanstalk EC2 instance, open a Systems Manager Session Manager session with an instance profile and network access configured for SSM.

```bash
sudo docker ps --format '{{.ID}} {{.Image}} {{.Names}}'
sudo docker exec FIN_SENSE_CONTAINER_ID npm run db:setup
```

Replace `FIN_SENSE_CONTAINER_ID` with the running FinSense container's ID. The command creates the Prisma tables and seeds the default categories. If reusing an existing database, back it up and review the schema before applying any changes. The setup command does not accept data loss automatically.

Admin access is optional. Register the intended user through the HTTPS site first, then run `sudo docker exec FIN_SENSE_CONTAINER_ID npm run user:make-admin -- user@example.com` with that user's exact email.

## 5. Verify the deployed app

1. Open `https://YOUR_HOSTNAME/api/health` and check for `{"status":"ok"}`.
2. Register a test user, create an account, and add a transaction. Confirm that the balance updates and the data remains after reloading.
3. Open and refresh `/transactions` and `/budgets` directly. Sign out, sign back in, and confirm the records are still present.
4. If you set a Gemini key, send a test message in **AI Adviser**. Visit the environment's **Logs** and **Events** if deployment or a request fails.

The Beanstalk environment creates billable AWS resources such as the load balancer and EC2 instances. RDS is billed separately when provisioned.

AWS references: [Docker platform](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/docker-platform.html), [source bundles](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/applications-sourcebundle.html), [load balancer settings](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environments-cfg-alb.html), [environment properties](https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create_deploy_docker.container.console.html), and [PostgreSQL connectivity](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ConnectToPostgreSQLInstance.html).
