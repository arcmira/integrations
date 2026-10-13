class Arcmira < Formula
  desc "Search YouTube transcripts, speaker appearances, mentions and sponsors"
  homepage "https://arcmira.com"
  url "https://registry.npmjs.org/arcmira/-/arcmira-0.6.0.tgz"
  sha256 "80108b6c9ea3871e1a57bca920396baed9482581b2f1c944517c4edc0cd82683"
  license "Apache-2.0"

  depends_on "node@24"

  def install
    ENV.prepend_path "PATH", formula_opt_bin("node@24")
    system "npm", "install", *std_npm_args
    (bin/"arcmira").write_env_script libexec/"bin/arcmira",
                                   PATH:                    "#{formula_opt_bin("node@24")}:$PATH",
                                   ARCMIRA_NO_UPDATE_CHECK: "1"
  end

  test do
    ENV.delete("ARCMIRA_API_KEY")
    ENV["XDG_CONFIG_HOME"] = testpath/"config"
    assert_equal version.to_s, shell_output("#{bin}/arcmira --version").strip

    operations = JSON.parse(shell_output("#{bin}/arcmira schema resolve --json"))
    assert_equal 1, operations.length
    assert_equal "resolve_entity", operations.first.fetch("operationId")
    assert_equal "GET", operations.first.fetch("method")
    assert_equal "/v1/entities/resolve", operations.first.fetch("path")
    query = operations.first.fetch("params").find { |parameter| parameter["name"] == "q" }
    assert_equal true, query.fetch("required")
  end
end
