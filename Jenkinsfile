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

    withCredentials([sshUserPrivateKey(credentialsId: '2b399dca-949a-46ca-945e-707e04291394', keyFileVariable: 'identity', passphraseVariable: '', usernameVariable: 'userName')]) {
        remote.user = userName
        remote.identityFile = identity

        stage('Remote SSH') {
            try {
                sshCommand remote: remote, command: "cd /opt/yeargin-hubot/ && git reset --hard origin/master && git pull && docker-compose build hubot && docker-compose up --no-deps -d hubot"
                slackSend (message: "${currentBuild.fullDisplayName} Success after ${currentBuild.durationString.minus(' and counting')} (<${env.BUILD_URL}|Open>)", color: '#37b787')
            } catch (ex) {
                slackSend (message: "${currentBuild.fullDisplayName} Failed after ${currentBuild.durationString.minus(' and counting')} (<${env.BUILD_URL}|Open>)", color: '#ff0000')
            }
        }
    }
}
