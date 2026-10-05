class Arcmira < Formula
  desc "Search YouTube transcripts, speaker appearances, mentions and sponsors"
  homepage "https://arcmira.com/docs"
  url "https://registry.npmjs.org/arcmira/-/arcmira-0.4.3.tgz"
  sha256 "7c2f8e39f930708d61e605bd5863933af2780c86c1622719f8fc17cbfcbd922e"
  license "Apache-2.0"

  depends_on "node@24"

  def install
    ENV.prepend_path "PATH", Formula["node@24"].opt_bin
    system "npm", "install", *std_npm_args
    (bin/"arcmira").write_env_script libexec/"bin/arcmira",
                                   PATH: "#{Formula["node@24"].opt_bin}:$PATH",
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
