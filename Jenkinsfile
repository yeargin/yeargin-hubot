node {
    def app
    def remote = [:]
    remote.name = 'syeargin-lab'
    remote.host = '10.255.19.14'
    remote.user = 'deploy'
    remote.allowAnyHosts = true

    stage('Clone repository') {
        slackSend (message: "${currentBuild.fullDisplayName} Build started (<${env.BUILD_URL}|Open>)", color: '#37b787')
        checkout scm
    }

    stage('Build image') {
        app = docker.build("yeargin/yeargin-hubot")
    }

    stage('Push image') {
        docker.withRegistry('https://registry.hub.docker.com', '5251fb33-a45a-4251-8271-b849fad23e03') {
            app.push("build-${env.BUILD_NUMBER}")
            app.push("latest")
        }
    }

    withCredentials([sshUserPrivateKey(credentialsId: '2b399dca-949a-46ca-945e-707e04291394', keyFileVariable: 'identity', passphraseVariable: '', usernameVariable: 'userName')]) {
        remote.user = userName
        remote.identityFile = identity

        stage('Remote SSH') {
            try {
                sshCommand remote: remote, command: "cd /opt/yeargin-hubot/ && git pull && docker-compose pull && docker-compose build && docker-compose restart"
                slackSend (message: "${currentBuild.fullDisplayName} Success after ${currentBuild.durationString.minus(' and counting')} (<${env.BUILD_URL}|Open>)", color: '#37b787')
            } catch (ex) {
                slackSend (message: "${currentBuild.fullDisplayName} Failed after ${currentBuild.durationString.minus(' and counting')} (<${env.BUILD_URL}|Open>)", color: '#ff0000')
            }
        }
    }
}
