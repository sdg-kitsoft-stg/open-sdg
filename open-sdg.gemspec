Gem::Specification.new do |spec|
  spec.name          = "open-sdg"
  spec.summary       = "A platform for collecting and disseminating data for the Sustainable Development Goal global indicators"
  spec.description   = "A platform for collecting and disseminating data for the Sustainable Development Goal global indicators"
  spec.version       = "2.4.0"
  spec.authors       = ["Open SDG team"]
  spec.email         = ["brockfanning@gmail.com"]
  spec.homepage      = "https://github.com/open-sdg/open-sdg"
  spec.licenses      = ["MIT"]

  spec.files = `git ls-files -z`.split("\x0").select do |f|
    f.match(%r!^(assets|_(includes|layouts|sass)/|(LICENSE|README)((\.(txt|md|markdown)|$)))!i)
  end

  # Open SDG 2.4.0 stack
  spec.add_dependency "jekyll", "~> 3.9"
  spec.add_dependency "jekyll-open-sdg-plugins", "~> 2.4.0"
end

