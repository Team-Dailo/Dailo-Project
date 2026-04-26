# Dailo DB Admin 접속 가이드

`dailo-db-admin` IAM 유저를 통해 SSM으로 EC2에 접속하고, RDS에 포트포워딩으로 연결하는 방법입니다.

---

## 1. Terraform Apply

```bash
cd infra/terraform/global/admin-access
terraform init
terraform apply
```

apply 후 출력값 확인:

```bash
terraform output iam_user_name          # IAM 유저 이름
terraform output access_key_id          # CLI용 Access Key ID
terraform output -raw secret_access_key # CLI용 Secret Access Key
terraform output -raw console_password  # 콘솔 초기 비밀번호
```

---

## 2. AWS 콘솔 로그인

### 로그인 URL

```
https://559198857556.signin.aws.amazon.com/console
```

### 로그인 정보

| 항목 | 값 |
|------|-----|
| 계정 ID | `559198857556` |
| IAM 사용자 이름 | `dailo-db-admin` |
| 초기 비밀번호 | `terraform output -raw console_password` 로 확인 |

> 첫 로그인 시 비밀번호 변경이 필요합니다.

### 콘솔에서 EC2 SSM 접속

1. 로그인 후 아래 링크로 이동:
   ```
   https://ap-northeast-2.console.aws.amazon.com/systems-manager/session-manager/start-session?region=ap-northeast-2
   ```
2. **Start session** 클릭
3. 인스턴스 목록에서 `dailo-ecs-node` 선택
4. **Start session** 클릭 -> 브라우저에서 바로 터미널 접속

> 콘솔에서는 포트포워딩이 불가능합니다. RDS 접속은 아래 CLI를 사용해야 합니다.

---

## 3. AWS CLI 설정

### 사전 설치

1. [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
2. [Session Manager Plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)
3. MySQL 클라이언트 (`brew install mysql-client` 또는 `apt install mysql-client`)

### 프로필 설정

```bash
aws configure --profile dailo-db-admin
```

| 입력 항목 | 값 |
|-----------|-----|
| AWS Access Key ID | terraform output으로 확인한 값 |
| AWS Secret Access Key | terraform output으로 확인한 값 |
| Default region name | `ap-northeast-2` |
| Default output format | `json` |

---

## 4. EC2 SSM 접속 (CLI)

```bash
# 현재 실행 중인 ECS 노드 확인
aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=dailo-ecs-node" "Name=instance-state-name,Values=running" \
  --query "Reservations[*].Instances[*].[InstanceId, PrivateIpAddress]" \
  --output table \
  --profile dailo-db-admin

# SSM 세션 시작
aws ssm start-session \
  --target <INSTANCE_ID> \
  --region ap-northeast-2 \
  --profile dailo-db-admin
```

현재 운영 중인 인스턴스:

| Instance ID | Private IP |
|-------------|------------|
| `i-0e52e6c2da4de176b` | `10.0.10.120` |
| `i-00c11a4f246d83257` | `10.0.11.205` |

---

## 5. RDS 접속 (SSM 포트포워딩)

RDS는 Private Subnet에 있어서 직접 접속이 불가능합니다.
EC2를 경유하는 SSM 포트포워딩으로 로컬에서 접속합니다.

### RDS 접속 정보

| 항목 | 값 |
|------|-----|
| RDS Endpoint | `dailo-db-instance.c5ciio2k4m3q.ap-northeast-2.rds.amazonaws.com` |
| Port | `3306` |
| DB Name | `dailo` |
| Username | `dailo` |
| Password | SSM Parameter Store에서 조회 (아래 참고) |

### Step 1: 포트포워딩 시작

```bash
aws ssm start-session \
  --target i-0e52e6c2da4de176b \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters '{
    "host": ["dailo-db-instance.c5ciio2k4m3q.ap-northeast-2.rds.amazonaws.com"],
    "portNumber": ["3306"],
    "localPortNumber": ["3307"]
  }' \
  --region ap-northeast-2 \
  --profile dailo-db-admin
```

> 이 터미널은 열어두어야 합니다. 새 터미널을 열고 다음 단계를 진행하세요.

### Step 2: MySQL 접속

```bash
mysql -h 127.0.0.1 -P 3307 -u dailo -p dailo
```

### DB 비밀번호 조회

```bash
aws ssm get-parameter \
  --name "/dailo/db/password" \
  --with-decryption \
  --query "Parameter.Value" \
  --output text \
  --profile dailo-db-admin
```

---

## 6. 한번에 접속하기 (스크립트)

```bash
#!/bin/bash
PROFILE="dailo-db-admin"
REGION="ap-northeast-2"
RDS_ENDPOINT="dailo-db-instance.c5ciio2k4m3q.ap-northeast-2.rds.amazonaws.com"

# 인스턴스 ID 자동 조회
INSTANCE_ID=$(aws ec2 describe-instances \
  --filters "Name=tag:Name,Values=dailo-ecs-node" "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].InstanceId" \
  --output text \
  --profile $PROFILE)

echo "Instance: $INSTANCE_ID"
echo "RDS: $RDS_ENDPOINT"
echo ""
echo "포트포워딩 시작... localhost:3307 -> RDS:3306"
echo "새 터미널에서: mysql -h 127.0.0.1 -P 3307 -u dailo -p dailo"

# 포트포워딩 시작
aws ssm start-session \
  --target $INSTANCE_ID \
  --document-name AWS-StartPortForwardingSessionToRemoteHost \
  --parameters "{\"host\":[\"$RDS_ENDPOINT\"],\"portNumber\":[\"3306\"],\"localPortNumber\":[\"3307\"]}" \
  --region $REGION \
  --profile $PROFILE
```

---

## 허용된 권한 요약

| 권한 | 범위 |
|------|------|
| SSM 세션 시작 | `dailo-ecs-node` 태그가 있는 EC2만 |
| SSM 포트포워딩 | EC2를 경유한 RDS 접속용 |
| EC2 조회 | 인스턴스 목록 (읽기 전용) |
| RDS 조회 | RDS 인스턴스 정보 (읽기 전용) |
| SSM Parameter 읽기 | `/dailo/db/*` 경로만 |
