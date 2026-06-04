pipeline {
    agent any

    environment {
        IMAGE_NAME = 'task-manager'
        STAGING_PORT = '3001'
        BUILD_TAG = "${IMAGE_NAME}:${BUILD_NUMBER}"
    }

    stages {

        // ── STAGE 1: BUILD ──────────────────────────────────────────
        stage('Build') {
            steps {
                echo "Building Docker image: ${BUILD_TAG}"
                sh 'npm ci'
                sh "docker build -t ${BUILD_TAG} -t ${IMAGE_NAME}:latest ."
                echo "Artifact: Docker image ${BUILD_TAG} created"
            }
        }

        // ── STAGE 2: TEST ───────────────────────────────────────────
        stage('Test') {
            steps {
                sh 'npm test -- --ci --forceExit'
            }
            post {
                always {
                    junit 'junit.xml'   // optional: add jest-junit reporter
                    publishHTML([
                        allowMissing: false,
                        reportDir: 'coverage/lcov-report',
                        reportFiles: 'index.html',
                        reportName: 'Coverage Report'
                    ])
                }
            }
        }

        // ── STAGE 3: CODE QUALITY ───────────────────────────────────
        stage('Code Quality') {
            steps {
                withSonarQubeEnv('SonarQube') {
                    sh '''
                        sonar-scanner \
                          -Dsonar.projectKey=task-manager \
                          -Dsonar.sources=src \
                          -Dsonar.tests=tests \
                          -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                    '''
                }
            }
        }

        // Quality Gate check (waits for SonarQube result)
        stage('Quality Gate') {
            steps {
                timeout(time: 2, unit: 'MINUTES') {
                    waitForQualityGate abortPipeline: true
                }
            }
        }

        // ── STAGE 4: SECURITY ───────────────────────────────────────
        stage('Security Scan') {
            steps {
                // Trivy scans the Docker image for CVEs
                sh """
                    docker run --rm \
                      -v /var/run/docker.sock:/var/run/docker.sock \
                      aquasec/trivy:latest image \
                      --exit-code 0 \
                      --severity HIGH,CRITICAL \
                      --format table \
                      ${IMAGE_NAME}:latest
                """
                // Save report for submission
                sh """
                    docker run --rm \
                      -v /var/run/docker.sock:/var/run/docker.sock \
                      aquasec/trivy:latest image \
                      --format json \
                      --output trivy-report.json \
                      ${IMAGE_NAME}:latest
                """
            }
            post {
                always {
                    archiveArtifacts artifacts: 'trivy-report.json', allowEmptyArchive: true
                }
            }
        }

        // ── STAGE 5: DEPLOY TO STAGING ──────────────────────────────
        stage('Deploy to Staging') {
            steps {
                echo 'Deploying to staging environment...'
                sh 'docker compose down --remove-orphans || true'
                sh 'docker compose up -d'
                // Health check
                sh '''
                    sleep 5
                    curl -f http://localhost:3001/health || exit 1
                '''
                echo "Staging live at http://localhost:3001"
            }
        }

        // ── STAGE 6: RELEASE TO PRODUCTION ──────────────────────────
        stage('Release') {
            steps {
                echo "Promoting build ${BUILD_NUMBER} to production..."
                // Tag image as prod
                sh "docker tag ${IMAGE_NAME}:latest ${IMAGE_NAME}:prod"
                // Create a Git tag for release traceability
                sh """
                    git config user.email 'jenkins@ci.local'
                    git config user.name 'Jenkins'
                    git tag -a v1.0.${BUILD_NUMBER} -m 'Release build ${BUILD_NUMBER}'
                    git push origin v1.0.${BUILD_NUMBER} || true
                """
                // Deploy production stack
                sh 'docker compose -f docker-compose.prod.yml down || true'
                sh 'docker compose -f docker-compose.prod.yml up -d'
                sh '''
                    sleep 5
                    curl -f http://localhost:3000/health || exit 1
                '''
                echo "Production live at http://localhost:3000"
            }
        }

        // ── STAGE 7: MONITORING ──────────────────────────────────────
        stage('Monitoring') {
            steps {
                echo 'Verifying monitoring stack...'
                // Prometheus and Grafana are started in docker-compose.prod.yml
                sh 'sleep 5'
                sh 'curl -f http://localhost:9090/-/healthy || echo "Prometheus starting up"'
                sh 'curl -f http://localhost:3002/api/health || echo "Grafana starting up"'
                // Verify metrics endpoint on the app
                sh 'curl -f http://localhost:3000/metrics | head -20'
                echo "Prometheus: http://localhost:9090"
                echo "Grafana:    http://localhost:3002 (admin/admin)"
            }
        }
    }

    // ── POST-PIPELINE NOTIFICATIONS ──────────────────────────────────
    post {
        success {
            echo "Pipeline SUCCESS – Build ${BUILD_NUMBER} deployed to production"
        }
        failure {
            echo "Pipeline FAILED – Check logs for build ${BUILD_NUMBER}"
            // Add email/Slack notification here if desired
        }
    }
}